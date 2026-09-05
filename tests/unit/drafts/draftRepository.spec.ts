import { defaultTemplate } from '../../../src/domain/templates/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';

import {
  CURRENT_RECORD_SCHEMA_VERSION,
  DRAFT_DATABASE_NAME,
  deleteDraftDatabase,
  getStorageEstimate,
  openDraftDatabase,
  requestPersistentStorage,
} from '../../../src/infrastructure/storage/database';
import {
  DraftRepository,
  DraftStorageError,
  type DraftSnapshot,
} from '../../../src/infrastructure/storage/draftRepository';
import {
  createEditingSession,
  editingSessionReducer,
} from '../../../src/domain/drafts/editingSession';
import type { SourcePhoto } from '../../../src/domain/photos/types';

const sessionId = 'session-storage-test';
const photoId = 'photo-storage-test';

function sourcePhoto(blob: Blob): SourcePhoto {
  return {
    id: photoId,
    sessionId,
    sourceBlob: blob,
    sourceName: 'fixture.png',
    sourceMime: 'image/png',
    sourceBytes: blob.size,
    sourceDigest: 'digest-fixture',
    rawWidth: 2,
    rawHeight: 2,
    displayWidth: 2,
    displayHeight: 2,
    orientation: 1,
    metadataSummary: {
      captureGps: null,
      orientationPresent: false,
      groups: [],
      preservationEligibility: 'none',
      excludedGroups: [],
    },
    coordinateId: null,
    overlayIds: [],
    reviewStatus: 'ready',
    failureCode: null,
  };
}

function snapshot(revision = 1): DraftSnapshot {
  const creating = createEditingSession({
    id: sessionId,
    photoIds: [photoId],
    now: '2026-08-17T00:00:00.000Z',
  });
  const session = editingSessionReducer(creating, {
    type: 'transition',
    status: 'editing',
    now: '2026-08-17T00:00:01.000Z',
  });
  return {
    session: { ...session, revision, lastPersistedRevision: revision },
    photos: [sourcePhoto(new Blob(['photo-bytes'], { type: 'image/png' }))],
  };
}

describe('DraftRepository', () => {
  beforeEach(async () => {
    await deleteDraftDatabase();
  });

  it('rolls back deletions if discarding fails midway through the transaction', async () => {
    const repository = new DraftRepository();
    await repository.save(snapshot(1));
    await repository.save(snapshot(2));
    const remove = IDBObjectStore.prototype.delete;
    let count = 0;
    const fault = vi.spyOn(IDBObjectStore.prototype, 'delete').mockImplementation(function (
      this: IDBObjectStore,
      key,
    ) {
      if (++count === 2) throw new DOMException('injected failure', 'UnknownError');
      return remove.call(this, key);
    });
    expect((await repository.discard(sessionId)).ok).toBe(false);
    fault.mockRestore();
    const db = await openDraftDatabase();
    try {
      expect(await db.count('revisions')).toBe(2);
      expect(await db.count('photos')).toBe(1);
      expect(await db.count('sessions')).toBe(1);
    } finally {
      db.close();
    }
    expect((await repository.restore(sessionId)).ok).toBe(true);
  });

  it('commits revisions transactionally and restores the newest complete revision with a Blob', async () => {
    const repository = new DraftRepository();
    const first = await repository.save(snapshot(1));
    const second = await repository.save(snapshot(2));

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    const restored = await repository.restore(sessionId);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.value.session.revision).toBe(2);
    expect(restored.value.photos[0].sourceBlob).toBeInstanceOf(Blob);
    expect(await restored.value.photos[0].sourceBlob.text()).toBe('photo-bytes');
  });

  it('discovers the latest restorable draft after an application reopen', async () => {
    expect((await new DraftRepository().save(snapshot(2))).ok).toBe(true);
    const restored = await new DraftRepository().restoreLatest();
    expect(restored.ok).toBe(true);
    if (restored.ok) expect(restored.value.session.id).toBe(sessionId);
  });

  it('does not select an incomplete revision when a prior committed revision exists', async () => {
    const repository = new DraftRepository();
    await repository.save(snapshot(1));
    const db = await openDraftDatabase();
    await db.put(
      'revisions',
      {
        sessionId,
        revision: 99,
        recordSchemaVersion: CURRENT_RECORD_SCHEMA_VERSION,
        status: 'pending',
        snapshot: snapshot(99),
        committedAt: '2026-08-17T00:00:02.000Z',
      },
      [sessionId, 99],
    );
    db.close();

    const restored = await repository.restore(sessionId);
    expect(restored.ok).toBe(true);
    if (restored.ok) expect(restored.value.session.revision).toBe(1);
  });

  it('returns an explicit incompatible result and leaves newer records untouched', async () => {
    const repository = new DraftRepository();
    const db = await openDraftDatabase();
    const newer = {
      sessionId,
      revision: 4,
      recordSchemaVersion: CURRENT_RECORD_SCHEMA_VERSION + 1,
      status: 'committed' as const,
      snapshot: snapshot(4),
      committedAt: '2026-08-17T00:00:04.000Z',
    };
    await db.put('revisions', newer, [sessionId, 4]);
    db.close();

    const result = await repository.restore(sessionId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('incompatible-version');
    const verify = await openDraftDatabase();
    await expect(verify.get('revisions', [sessionId, 4])).resolves.toMatchObject(newer);
    verify.close();
  });

  it('removes all restorable data only after explicit cleanup', async () => {
    const repository = new DraftRepository();
    await repository.save(snapshot(1));
    expect((await repository.restore(sessionId)).ok).toBe(true);

    expect((await repository.cleanup(sessionId, 'exported')).ok).toBe(true);
    expect((await repository.restore(sessionId)).ok).toBe(false);

    await repository.save(snapshot(1));
    expect((await repository.cleanup(sessionId, 'discarded')).ok).toBe(true);
    expect((await repository.restore(sessionId)).ok).toBe(false);
  });

  it('maps quota failures to an actionable typed error without retaining sensitive details', async () => {
    const repository = new DraftRepository({
      writeTransaction: vi.fn().mockRejectedValue(
        Object.assign(new DOMException('full', 'QuotaExceededError'), {
          detail: 'private-photo.png',
        }),
      ),
    });
    const result = await repository.save(snapshot(1));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('quota-exceeded');
      expect(result.error.message).toMatch(/storage/i);
      expect(JSON.stringify(result)).not.toContain('private-photo');
    }
  });

  it('exposes persistence denial as a non-blocking typed status', async () => {
    const result = await requestPersistentStorage({
      storage: { persist: vi.fn().mockResolvedValue(false) },
    });
    expect(result).toEqual({ status: 'denied' });
  });

  it('provides a bounded storage estimate adapter', async () => {
    await expect(
      getStorageEstimate({
        storage: { estimate: vi.fn().mockResolvedValue({ usage: 10, quota: 100 }) },
      }),
    ).resolves.toEqual({ usage: 10, quota: 100, available: 90 });
  });

  it('uses a stable database contract', () => {
    expect(DRAFT_DATABASE_NAME).toBe('photo-marker-v2');
  });

  it('exports a typed storage error for callers that need exception handling', () => {
    const error = new DraftStorageError('persistence-denied');
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('persistence-denied');
    expect(error.message).toMatch(/persist/i);
  });
});

describe('new-version storage boundary', () => {
  it('creates all seven stores without reading the old database', async () => {
    const old = await openDraftDatabase({ name: 'photo-marker-drafts' });
    await old.put(
      'sessions',
      { sessionId: 'old', latestRevision: 1, recordSchemaVersion: 1, updatedAt: '2099' },
      'old',
    );
    const fresh = await openDraftDatabase();
    expect([...fresh.objectStoreNames]).toEqual([
      'photos',
      'preferences',
      'revisions',
      'sessions',
      'sharedIntake',
      'templates',
      'watermarkAssets',
    ]);
    expect(await fresh.get('sessions', 'old')).toBeUndefined();
    expect(await old.get('sessions', 'old')).toBeDefined();
    fresh.close();
    old.close();
  });
});

describe('canonical schema boundary', () => {
  it('rejects old schemas without invoking a migration or altering the record', async () => {
    const db = await openDraftDatabase({ name: 'canonical-boundary' });
    const record = {
      sessionId,
      revision: 1,
      recordSchemaVersion: 0,
      status: 'committed' as const,
      snapshot: snapshot(),
      committedAt: '2026',
    };
    await db.put('revisions', record, [sessionId, 1]);
    const storedBefore = await db.get('revisions', [sessionId, 1]);
    const migrate = vi.fn();
    const repository = new DraftRepository({ database: db, migrate });
    const restored = await repository.restore(sessionId);
    expect(restored.ok).toBe(false);
    expect(migrate).not.toHaveBeenCalled();
    expect(await db.get('revisions', [sessionId, 1])).toEqual(storedBefore);
    db.close();
  });
});

describe('draft asset atomicity', () => {
  it('aborts missing asset references without replacing a committed revision', async () => {
    const db = await openDraftDatabase({ name: 'draft-assets' });
    const repository = new DraftRepository({ database: db });
    expect((await repository.save(snapshot(1))).ok).toBe(true);
    const saved = await repository.save({
      ...snapshot(2),
      watermarkConfigs: [
        {
          enabled: true,
          kind: 'image',
          text: '',
          assetId: 'missing',
          opacity: 1,
          mode: 'single',
          singlePosition: 'center',
          density: 'low',
        },
      ],
    });
    expect(saved.ok).toBe(false);
    expect((await db.get('sessions', sessionId))?.latestRevision).toBe(1);
    expect(await db.get('revisions', [sessionId, 2])).toBeUndefined();
    db.close();
  });
});

describe('nested draft asset reference', () => {
  it('rejects a template reference even when the explicit watermark list is empty', async () => {
    const db = await openDraftDatabase({ name: 'nested-assets' });
    const repository = new DraftRepository({ database: db });
    const saved = await repository.save({
      ...snapshot(),
      watermarkConfigs: [],
      editorTemplate: {
        ...defaultTemplate,
        watermark: { ...defaultTemplate.watermark, kind: 'image', assetId: 'missing' },
      },
    });
    expect(saved.ok).toBe(false);
    if (!saved.ok) expect(saved.error.code).toBe('asset-not-found');
    expect(await db.get('sessions', sessionId)).toBeUndefined();
    db.close();
  });
});
