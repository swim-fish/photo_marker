import { sameAsset } from './immutableAsset';
import type { AnnotationTemplate, CornerTexts } from '../../domain/templates/types';
import type {
  WatermarkConfig,
  WatermarkArrangement,
  WatermarkAsset,
} from '../../domain/watermarks/types';
import type { IDBPDatabase } from 'idb';

import { failure, type Result, success } from '../../domain/result';
import type { CoordinateRecord } from '../../domain/coordinates/types';
import type { EditingSession } from '../../domain/drafts/types';
import type { ExportConfiguration, ExportResult } from '../../domain/export/types';
import type { SourcePhoto } from '../../domain/photos/types';
import type { TextOverlay } from '../../domain/overlays/types';
import { CURRENT_RECORD_SCHEMA_VERSION, type MigratableDraftRecord } from './migrations';
import {
  getStorageEstimate,
  openDraftDatabase,
  requestPersistentStorage,
  type DraftDatabase,
  type DraftDatabaseSchema,
  type DraftPhotoRecord,
  type DraftRevisionRecord,
  type SharedIntakeFileRecord,
  type StorageManagerLike,
  type StorageEstimate,
} from './database';

export type PersistedDraftSnapshot = Readonly<{
  session: EditingSession;
  editorTemplate?: AnnotationTemplate;
  cornerTexts?: CornerTexts;
  watermarkConfigs?: readonly WatermarkConfig[];
  watermarkArrangements?: readonly WatermarkArrangement[];
  selectedTemplateId?: string;
  coordinates?: readonly CoordinateRecord[];
  overlays?: readonly TextOverlay[];
  exportConfigurations?: readonly ExportConfiguration[];
  exportResults?: readonly ExportResult[];
  batchInvalidItems?: readonly Readonly<{
    id: string;
    sourceName: string;
    failureCode: string;
  }>[];
  batchDecisions?: readonly Readonly<{
    photoId: string;
    decision: 'required' | 'omit' | 'withoutCoordinate';
  }>[];
}>;

export type DraftSnapshot = PersistedDraftSnapshot &
  Readonly<{
    photos: readonly SourcePhoto[];
  }>;

export type DraftStorageErrorCode =
  | 'asset-not-found'
  | 'asset-conflict'
  | 'not-found'
  | 'persistence-denied'
  | 'quota-exceeded'
  | 'storage-error'
  | 'incompatible-version'
  | 'migration-failed';

export type DraftStorageDiagnostic = Readonly<{
  code: DraftStorageErrorCode;
  message: string;
  action: string;
}>;

export type DraftResult<T> = Result<T, DraftStorageErrorCode> & {
  error?: DraftStorageDiagnostic;
};

export type DraftSaveSummary = Readonly<{
  sessionId: string;
  revision: number;
  persistenceStatus: 'unknown' | 'bestEffort' | 'persistent' | 'denied' | 'quotaExceeded';
}>;

export type DraftRepositoryOptions = Readonly<{
  database?: DraftDatabase;
  databaseName?: string;
  storage?: StorageManagerLike;
  requestPersistence?: boolean;
  /** Test and release tooling hook for simulating an atomic write failure. */
  writeTransaction?: (snapshot: DraftSnapshot) => Promise<void>;
  /** Optional record migration hook. It must return a new record and never mutate its input. */
  migrate?: (record: MigratableDraftRecord, fromVersion: number) => MigratableDraftRecord;
}>;

export class DraftStorageError extends Error {
  readonly code: DraftStorageErrorCode;
  readonly action: string;

  constructor(code: DraftStorageErrorCode, cause?: unknown) {
    super(diagnosticFor(code).message);
    this.name = 'DraftStorageError';
    this.code = code;
    this.action = diagnosticFor(code).action;
    if (cause !== undefined) this.cause = cause;
  }
}

/** Transactional local repository for source Blobs and versioned canonical draft state. */
export class DraftRepository {
  private readonly options: DraftRepositoryOptions;
  private databasePromise: Promise<DraftDatabase> | undefined;
  private persistenceStatus: DraftSaveSummary['persistenceStatus'] = 'unknown';

  constructor(options: DraftRepositoryOptions = {}) {
    this.options = options;
  }

  async save(
    snapshot: DraftSnapshot,
    assets: readonly WatermarkAsset[] = [],
  ): Promise<DraftResult<DraftSaveSummary>> {
    const ownsDatabase = !this.options.database && !this.options.writeTransaction;
    try {
      const persistence = await this.preparePersistence();
      if (this.options.writeTransaction) {
        await this.options.writeTransaction(snapshot);
      } else {
        const database = await this.database();
        const { photos, ...persistedSnapshot } = snapshot;
        const revision = snapshot.session.revision;
        const committedAt = new Date().toISOString();
        const photoRecords = await Promise.all(
          photos.map(async (photo): Promise<DraftPhotoRecord> => ({
            id: photo.id,
            sessionId: snapshot.session.id,
            recordSchemaVersion: CURRENT_RECORD_SCHEMA_VERSION,
            photo,
            sourceBytes: await photo.sourceBlob.arrayBuffer(),
          })),
        );
        const transaction = database.transaction(
          ['sessions', 'revisions', 'photos', 'watermarkAssets'],
          'readwrite',
        );
        const revisionRecord: DraftRevisionRecord = {
          sessionId: snapshot.session.id,
          revision,
          recordSchemaVersion: CURRENT_RECORD_SCHEMA_VERSION,
          status: 'committed',
          snapshot: persistedSnapshot,
          committedAt,
        };
        const sessionRecord = {
          sessionId: snapshot.session.id,
          recordSchemaVersion: CURRENT_RECORD_SCHEMA_VERSION,
          latestRevision: revision,
          updatedAt: snapshot.session.updatedAt,
        };
        try {
          for (const asset of assets) {
            const existing = await transaction.objectStore('watermarkAssets').get(asset.id);
            if (existing && !sameAsset(existing, asset))
              throw new DraftStorageError('asset-conflict');
            if (!existing) await transaction.objectStore('watermarkAssets').add(asset, asset.id);
          }
          for (const config of [
            ...(snapshot.watermarkConfigs ?? []),
            ...(snapshot.editorTemplate ? [snapshot.editorTemplate.watermark] : []),
          ]) {
            if (
              config.kind === 'image' &&
              (!config.assetId ||
                !(await transaction.objectStore('watermarkAssets').get(config.assetId)))
            )
              throw new DraftStorageError('asset-not-found');
          }
          await transaction.objectStore('sessions').put(sessionRecord, snapshot.session.id);
          for (const photoRecord of photoRecords) {
            await transaction.objectStore('photos').put(photoRecord, photoRecord.id);
          }
          await transaction
            .objectStore('revisions')
            .put(revisionRecord, [snapshot.session.id, revision]);
          await transaction.done;
        } catch (error) {
          try {
            transaction.abort();
          } catch {
            /* Already aborted. */
          }
          await transaction.done.catch(() => undefined);
          throw error;
        }
      }
      return success({
        sessionId: snapshot.session.id,
        revision: snapshot.session.revision,
        persistenceStatus: persistence,
      });
    } catch (error) {
      return failureResult(
        error instanceof DraftStorageError
          ? error.code
          : isQuotaError(error)
            ? 'quota-exceeded'
            : 'storage-error',
      );
    } finally {
      if (ownsDatabase) this.close();
    }
  }

  async restore(sessionId: string): Promise<DraftResult<DraftSnapshot>> {
    const ownsDatabase = !this.options.database;
    try {
      const database = await this.database();
      const records = await database.getAllFromIndex('revisions', 'by-session', sessionId);
      if (records.length === 0) return failureResult('not-found');

      // Do not migrate, rewrite, or delete an unknown record. It may belong to a newer app version.
      if (records.some((record) => record.recordSchemaVersion > CURRENT_RECORD_SCHEMA_VERSION)) {
        return failureResult('incompatible-version');
      }

      const candidates = records
        .filter((record) => record.status === 'committed')
        .sort((left, right) => right.revision - left.revision);
      for (const record of candidates) {
        if (record.recordSchemaVersion !== CURRENT_RECORD_SCHEMA_VERSION)
          return failureResult('incompatible-version');
        const migratedRecord = record;
        const snapshot = migratedRecord.snapshot as PersistedDraftSnapshot & {
          photos?: readonly SourcePhoto[];
        };
        for (const config of [
          ...(snapshot.watermarkConfigs ?? []),
          ...(snapshot.editorTemplate ? [snapshot.editorTemplate.watermark] : []),
        ]) {
          if (
            config.kind === 'image' &&
            (!config.assetId || !(await database.get('watermarkAssets', config.assetId)))
          )
            return failureResult('asset-not-found');
        }
        const persistedPhotos = snapshot.photos?.length
          ? [...snapshot.photos]
          : await this.photosForRevision(database, snapshot.session, sessionId);
        if (!persistedPhotos || persistedPhotos.length !== snapshot.session.photoIds.length)
          continue;

        return success({ ...snapshot, photos: persistedPhotos } as DraftSnapshot);
      }
      return failureResult('storage-error');
    } catch (error) {
      return failureResult(
        error instanceof DraftStorageError
          ? error.code
          : isQuotaError(error)
            ? 'quota-exceeded'
            : 'storage-error',
      );
    } finally {
      if (ownsDatabase) this.close();
    }
  }

  async restoreLatest(): Promise<DraftResult<DraftSnapshot>> {
    const ownsDatabase = !this.options.database;
    let latestSessionId: string | undefined;
    try {
      const database = await this.database();
      const sessions = await database.getAll('sessions');
      latestSessionId = sessions.sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      )[0]?.sessionId;
    } catch {
      return failureResult('storage-error');
    } finally {
      if (ownsDatabase) this.close();
    }
    return latestSessionId ? this.restore(latestSessionId) : failureResult('not-found');
  }

  async cleanup(sessionId: string, reason: 'exported' | 'discarded'): Promise<DraftResult<void>> {
    void reason;
    const ownsDatabase = !this.options.database;
    try {
      const database = await this.database();
      const transaction = database.transaction(['sessions', 'revisions', 'photos'], 'readwrite');
      const revisionStore = transaction.objectStore('revisions');
      const photoStore = transaction.objectStore('photos');
      const revisions = await revisionStore.index('by-session').getAllKeys(sessionId);
      const photos = await photoStore.index('by-session').getAllKeys(sessionId);
      for (const key of revisions) await revisionStore.delete(key);
      for (const key of photos) await photoStore.delete(key);
      await transaction.objectStore('sessions').delete(sessionId);
      await transaction.done;
      return success(undefined);
    } catch (error) {
      return failureResult(
        error instanceof DraftStorageError
          ? error.code
          : isQuotaError(error)
            ? 'quota-exceeded'
            : 'storage-error',
      );
    } finally {
      if (ownsDatabase) this.close();
    }
  }

  async discard(sessionId: string): Promise<DraftResult<void>> {
    return this.cleanup(sessionId, 'discarded');
  }

  async removeDraft(sessionId: string): Promise<DraftResult<void>> {
    return this.cleanup(sessionId, 'discarded');
  }

  async estimateStorage(): Promise<StorageEstimate> {
    return getStorageEstimate({ storage: this.options.storage });
  }

  async requestPersistentStorage(): Promise<DraftSaveSummary['persistenceStatus']> {
    const result = await requestPersistentStorage({ storage: this.options.storage });
    this.persistenceStatus =
      result.status === 'persistent'
        ? 'persistent'
        : result.status === 'denied'
          ? 'denied'
          : 'bestEffort';
    return this.persistenceStatus;
  }

  close(): void {
    void this.databasePromise?.then((database) => database.close());
    this.databasePromise = undefined;
  }

  private async database(): Promise<DraftDatabase> {
    if (this.options.database) return this.options.database;
    this.databasePromise ??= openDraftDatabase({ name: this.options.databaseName });
    return this.databasePromise;
  }

  private async preparePersistence(): Promise<DraftSaveSummary['persistenceStatus']> {
    if (this.persistenceStatus !== 'unknown') return this.persistenceStatus;
    if (this.options.requestPersistence === false) {
      this.persistenceStatus = 'bestEffort';
      return this.persistenceStatus;
    }
    return this.requestPersistentStorage();
  }

  private async photosForRevision(
    database: DraftDatabase,
    session: EditingSession,
    sessionId: string,
  ): Promise<readonly SourcePhoto[] | undefined> {
    const records = await database.getAllFromIndex('photos', 'by-session', sessionId);
    const byId = new Map(
      records.map((record) => [
        record.id,
        {
          ...record.photo,
          sourceBlob: hasBlobApi(record.photo.sourceBlob)
            ? record.photo.sourceBlob
            : new Blob([record.sourceBytes], { type: record.photo.sourceMime }),
        },
      ]),
    );
    const photos = session.photoIds.map((photoId) => byId.get(photoId));
    return photos.every((photo): photo is SourcePhoto => photo !== undefined) ? photos : undefined;
  }
}

/**
 * Store Web Share Target files locally for the application shell to consume later. This adapter is
 * intentionally independent of a window and never uses Cache Storage or a network request.
 */
export async function persistSharedFiles(files: readonly File[]): Promise<void> {
  if (files.length === 0) return;
  let records: SharedIntakeFileRecord[];
  try {
    records = await Promise.all(
      files.map(async (file) => ({
        id: createLocalId(),
        recordSchemaVersion: CURRENT_RECORD_SCHEMA_VERSION,
        name: file.name,
        mime: file.type,
        size: file.size,
        blob: file,
        sourceBytes: await file.arrayBuffer(),
        createdAt: new Date().toISOString(),
      })),
    );
  } catch (error) {
    throw new DraftStorageError(isQuotaError(error) ? 'quota-exceeded' : 'storage-error', error);
  }
  const database = await openDraftDatabase();
  try {
    const transaction = database.transaction('sharedIntake', 'readwrite');
    for (const record of records) {
      await transaction.objectStore('sharedIntake').put(record, record.id);
    }
    await transaction.done;
  } catch (error) {
    throw new DraftStorageError(isQuotaError(error) ? 'quota-exceeded' : 'storage-error', error);
  } finally {
    database.close();
  }
}

/** Atomically read and remove pending shared files after the app accepts them. */
export async function consumeSharedFiles(): Promise<readonly File[]> {
  const database = await openDraftDatabase();
  try {
    const transaction = database.transaction('sharedIntake', 'readwrite');
    const records = await transaction.objectStore('sharedIntake').index('by-created').getAll();
    const files = records.map(toFile);
    for (const record of records) {
      await transaction.objectStore('sharedIntake').delete(record.id);
    }
    await transaction.done;
    return files;
  } catch (error) {
    throw new DraftStorageError(isQuotaError(error) ? 'quota-exceeded' : 'storage-error', error);
  } finally {
    database.close();
  }
}

export function createDraftRepository(options: DraftRepositoryOptions = {}): DraftRepository {
  return new DraftRepository(options);
}

function failureResult<T>(code: DraftStorageErrorCode): DraftResult<T> {
  const diagnostic = diagnosticFor(code);
  return {
    ...failure(code),
    error: diagnostic,
  } as DraftResult<T>;
}

function diagnosticFor(code: DraftStorageErrorCode): DraftStorageDiagnostic {
  switch (code) {
    case 'asset-not-found':
      return {
        code,
        message: 'A watermark image is missing.',
        action: 'Select the PNG watermark again before saving.',
      };
    case 'asset-conflict':
      return {
        code,
        message: 'A watermark image identifier is already in use.',
        action: 'Import the image again with a new identifier.',
      };
    case 'not-found':
      return {
        code,
        message: 'No restorable local draft is available.',
        action: 'Continue by importing the source photo.',
      };
    case 'persistence-denied':
      return {
        code,
        message: 'Persistent local storage was not granted.',
        action: 'Continue editing; retry storage permission later.',
      };
    case 'quota-exceeded':
      return {
        code,
        message: 'Local storage is full.',
        action: 'Remove site data or a draft, then retry saving.',
      };
    case 'incompatible-version':
      return {
        code,
        message: 'This saved draft was created by a newer application version.',
        action: 'Update the application before restoring it.',
      };
    case 'migration-failed':
      return {
        code,
        message: 'The saved draft could not be migrated safely.',
        action: 'Keep the previous application version and retry recovery.',
      };
    case 'storage-error':
      return {
        code,
        message: 'Local recovery is temporarily unavailable.',
        action: 'Keep the in-memory work and retry saving.',
      };
  }
}

function isQuotaError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'QuotaExceededError'
  );
}

function hasBlobApi(blob: Blob): blob is Blob & { arrayBuffer: () => Promise<ArrayBuffer> } {
  return typeof (blob as Blob & { arrayBuffer?: unknown }).arrayBuffer === 'function';
}

function createLocalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `shared-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toFile(record: SharedIntakeFileRecord): File {
  const blob = hasBlobApi(record.blob)
    ? record.blob
    : new Blob([record.sourceBytes], { type: record.mime });
  if (typeof File !== 'undefined') return new File([blob], record.name, { type: record.mime });
  return blob as File;
}

export type { DraftDatabaseSchema, IDBPDatabase };
