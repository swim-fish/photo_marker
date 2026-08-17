import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from 'idb';

import { CURRENT_RECORD_SCHEMA_VERSION, type MigratedDraftRecord } from './migrations';
import type { DraftSnapshot, PersistedDraftSnapshot } from './draftRepository';

export const DRAFT_DATABASE_NAME = 'photo-marker-drafts';
export const DRAFT_DATABASE_VERSION = 1;

export const DRAFT_STORE_NAMES = {
  sessions: 'sessions',
  revisions: 'revisions',
  photos: 'photos',
  sharedIntake: 'sharedIntake',
} as const;

export type DraftRevisionStatus = 'pending' | 'committed';

export type DraftSessionRecord = Readonly<{
  sessionId: string;
  recordSchemaVersion: number;
  latestRevision: number;
  updatedAt: string;
}>;

export type DraftRevisionRecord = Readonly<{
  sessionId: string;
  revision: number;
  recordSchemaVersion: number;
  status: DraftRevisionStatus;
  snapshot: DraftSnapshot | PersistedDraftSnapshot;
  committedAt: string;
}>;

export type DraftPhotoRecord = Readonly<{
  id: string;
  sessionId: string;
  recordSchemaVersion: number;
  photo: DraftSnapshot['photos'][number];
  /** Byte fallback keeps Blob restoration deterministic in test and restricted browser clones. */
  sourceBytes: ArrayBuffer;
}>;

export type SharedIntakeFileRecord = Readonly<{
  id: string;
  recordSchemaVersion: number;
  name: string;
  mime: string;
  size: number;
  blob: Blob;
  sourceBytes: ArrayBuffer;
  createdAt: string;
}>;

export interface DraftDatabaseSchema extends DBSchema {
  sessions: {
    key: string;
    value: DraftSessionRecord;
  };
  revisions: {
    key: [string, number];
    value: DraftRevisionRecord;
    indexes: {
      'by-session': string;
      'by-status': DraftRevisionStatus;
    };
  };
  photos: {
    key: string;
    value: DraftPhotoRecord;
    indexes: {
      'by-session': string;
    };
  };
  sharedIntake: {
    key: string;
    value: SharedIntakeFileRecord;
    indexes: {
      'by-created': string;
    };
  };
}

export type DraftDatabase = IDBPDatabase<DraftDatabaseSchema>;

export type StorageManagerLike = Readonly<{
  estimate?: () => Promise<StorageEstimateLike>;
  persist?: () => Promise<boolean>;
}>;

export type StorageEstimateLike = Readonly<{
  usage?: number;
  quota?: number;
}>;

export type StorageEstimate = Readonly<{
  usage: number | null;
  quota: number | null;
  available: number | null;
}>;

export type PersistenceRequestResult = Readonly<{
  status: 'persistent' | 'denied' | 'unknown';
}>;

export async function openDraftDatabase(
  options: Readonly<{
    name?: string;
    databaseVersion?: number;
  }> = {},
): Promise<DraftDatabase> {
  const name = options.name ?? DRAFT_DATABASE_NAME;
  const databaseVersion = options.databaseVersion ?? DRAFT_DATABASE_VERSION;
  return openDB<DraftDatabaseSchema>(name, databaseVersion, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(DRAFT_STORE_NAMES.sessions)) {
        database.createObjectStore(DRAFT_STORE_NAMES.sessions);
      }
      if (!database.objectStoreNames.contains(DRAFT_STORE_NAMES.revisions)) {
        const store = database.createObjectStore(DRAFT_STORE_NAMES.revisions);
        store.createIndex('by-session', 'sessionId');
        store.createIndex('by-status', 'status');
      }
      if (!database.objectStoreNames.contains(DRAFT_STORE_NAMES.photos)) {
        const store = database.createObjectStore(DRAFT_STORE_NAMES.photos);
        store.createIndex('by-session', 'sessionId');
      }
      if (!database.objectStoreNames.contains(DRAFT_STORE_NAMES.sharedIntake)) {
        const store = database.createObjectStore(DRAFT_STORE_NAMES.sharedIntake);
        store.createIndex('by-created', 'createdAt');
      }
    },
  });
}

export async function deleteDraftDatabase(name = DRAFT_DATABASE_NAME): Promise<void> {
  await deleteDB(name);
}

/** Return an estimate without turning unavailable browser APIs into an application failure. */
export async function getStorageEstimate(
  options: Readonly<{ storage?: StorageManagerLike }> = {},
): Promise<StorageEstimate> {
  const storage = options.storage ?? getNavigatorStorage();
  if (!storage?.estimate) return { usage: null, quota: null, available: null };

  try {
    const estimate = await storage.estimate();
    const usage = finiteNonNegative(estimate.usage);
    const quota = finiteNonNegative(estimate.quota);
    return {
      usage,
      quota,
      available: usage !== null && quota !== null ? Math.max(0, quota - usage) : null,
    };
  } catch {
    return { usage: null, quota: null, available: null };
  }
}

/** Request durable storage after meaningful user action; denial never blocks in-memory editing. */
export async function requestPersistentStorage(
  options: Readonly<{ storage?: StorageManagerLike }> = {},
): Promise<PersistenceRequestResult> {
  const storage = options.storage ?? getNavigatorStorage();
  if (!storage?.persist) return { status: 'unknown' };
  try {
    return { status: (await storage.persist()) ? 'persistent' : 'denied' };
  } catch {
    return { status: 'unknown' };
  }
}

function finiteNonNegative(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function getNavigatorStorage(): StorageManagerLike | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const storage = navigator.storage;
  return storage as StorageManagerLike | undefined;
}

export { CURRENT_RECORD_SCHEMA_VERSION };
export type { MigratedDraftRecord };
