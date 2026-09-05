import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';

import {
  deleteDraftDatabase,
  openDraftDatabase,
} from '../../../src/infrastructure/storage/database';
import {
  consumeSharedFiles,
  DraftRepository,
  persistSharedFiles,
  type DraftSnapshot,
} from '../../../src/infrastructure/storage/draftRepository';
import { createEditingSession } from '../../../src/domain/drafts/editingSession';
import type { SourcePhoto } from '../../../src/domain/photos/types';

const sessionId = 'integration-draft-session';
const photoId = 'integration-photo';

function createSnapshot(blob: Blob): DraftSnapshot {
  const session = createEditingSession({
    id: sessionId,
    photoIds: [photoId],
    now: '2026-08-17T00:00:00.000Z',
  });
  const photo: SourcePhoto = {
    id: photoId,
    sessionId,
    sourceBlob: blob,
    sourceName: 'integration.png',
    sourceMime: 'image/png',
    sourceBytes: blob.size,
    sourceDigest: 'integration-digest',
    rawWidth: 1,
    rawHeight: 1,
    displayWidth: 1,
    displayHeight: 1,
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
  return { session, photos: [photo] };
}

describe('draft recovery integration', () => {
  it('restores the source Blob byte-for-byte after closing and reopening the repository', async () => {
    await deleteDraftDatabase();
    const source = new Blob([new Uint8Array([0, 1, 2, 253, 254, 255])], { type: 'image/png' });
    const digest = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', await source.arrayBuffer())),
    )
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    const writer = new DraftRepository();
    expect((await writer.save(createSnapshot(source))).ok).toBe(true);

    const reader = new DraftRepository();
    const restored = await reader.restore(sessionId);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    const restoredBytes = await restored.value.photos[0].sourceBlob.arrayBuffer();
    const restoredDigest = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', restoredBytes)),
    )
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    expect(restoredDigest).toBe(digest);
    expect(restored.value.photos[0].sourceBlob.type).toBe('image/png');
  });

  it('restores additive batch decisions, invalid intake, and partial results', async () => {
    await deleteDraftDatabase();
    const snapshot: DraftSnapshot = {
      ...createSnapshot(new Blob(['batch'], { type: 'image/png' })),
      batchInvalidItems: [
        { id: 'invalid-batch-item', sourceName: 'broken.txt', failureCode: 'unsupported-format' },
      ],
      batchDecisions: [{ photoId, decision: 'withoutCoordinate' }],
      exportResults: [
        {
          photoId,
          status: 'failed',
          outputName: null,
          outputMime: null,
          outputBytes: null,
          saveMethod: null,
          failureCode: 'save-failed',
          startedAt: '2026-08-17T00:00:01.000Z',
          finishedAt: '2026-08-17T00:00:02.000Z',
          phaseDurationsMs: {},
        },
      ],
    };
    expect((await new DraftRepository().save(snapshot)).ok).toBe(true);

    const restored = await new DraftRepository().restore(sessionId);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.value.batchInvalidItems).toEqual(snapshot.batchInvalidItems);
    expect(restored.value.batchDecisions).toEqual(snapshot.batchDecisions);
    expect(restored.value.exportResults).toEqual(snapshot.exportResults);
  });

  it('runs additive migration without deleting the previous readable revision', async () => {
    await deleteDraftDatabase();
    const repository = new DraftRepository();
    const original = createSnapshot(new Blob(['old'], { type: 'image/png' }));
    expect((await repository.save(original)).ok).toBe(true);

    const db = await openDraftDatabase();
    const migrated = {
      ...original,
      session: { ...original.session, schemaVersion: 2, revision: 2 },
    };
    await db.put(
      'revisions',
      {
        sessionId,
        revision: 2,
        recordSchemaVersion: 1,
        status: 'committed',
        snapshot: migrated,
        committedAt: '2026-08-17T00:00:02.000Z',
      },
      [sessionId, 2],
    );
    db.close();
    const restored = await new DraftRepository().restore(sessionId);
    expect(restored.ok).toBe(true);
    if (restored.ok) expect(restored.value.session.revision).toBe(2);
  });

  it('rejects a noncanonical record without migrating or deleting committed data', async () => {
    await deleteDraftDatabase();
    const repository = new DraftRepository({
      migrate: () => {
        throw new Error('migration failure with private details');
      },
    });
    const original = createSnapshot(new Blob(['safe'], { type: 'image/png' }));
    expect((await repository.save(original)).ok).toBe(true);
    const db = await openDraftDatabase();
    await db.put(
      'revisions',
      {
        sessionId,
        revision: 2,
        recordSchemaVersion: 0,
        status: 'committed',
        snapshot: {
          session: { ...original.session, revision: 2 },
          photos: [],
        },
        committedAt: '2026-08-17T00:00:02.000Z',
      },
      [sessionId, 2],
    );
    db.close();
    const result = await repository.restore(sessionId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('incompatible-version');

    const previous = await new DraftRepository({ migrate: undefined }).restore(sessionId);
    expect(previous.ok).toBe(false);
    const verify = await openDraftDatabase();
    expect(await verify.get('revisions', [sessionId, original.session.revision])).toBeDefined();
    expect((await verify.get('revisions', [sessionId, 2]))?.recordSchemaVersion).toBe(0);
    verify.close();
  });

  it('never writes source blobs to Cache Storage', async () => {
    await deleteDraftDatabase();
    let openSpy: ReturnType<typeof vi.spyOn> | undefined;
    try {
      openSpy = vi.spyOn(globalThis.caches, 'open');
    } catch {
      openSpy = undefined;
    }
    await new DraftRepository().save(createSnapshot(new Blob(['source'], { type: 'image/png' })));
    if (openSpy) expect(openSpy).not.toHaveBeenCalled();
    openSpy?.mockRestore();
  });

  it('stores and consumes shared files transactionally without Cache Storage', async () => {
    await deleteDraftDatabase();
    const file = new File([new Uint8Array([9, 8, 7])], 'shared.png', { type: 'image/png' });
    await persistSharedFiles([file]);
    const consumed = await consumeSharedFiles();
    expect(consumed).toHaveLength(1);
    expect(consumed[0].name).toBe('shared.png');
    expect(await consumed[0].arrayBuffer()).toEqual(await file.arrayBuffer());
    await expect(consumeSharedFiles()).resolves.toEqual([]);
  });

  it('prepares asynchronously read share bytes before opening the write transaction', async () => {
    await deleteDraftDatabase();
    const bytes = new Uint8Array([4, 5, 6]);
    const file = new File([bytes], 'slow-shared.png', { type: 'image/png' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
        return bytes.buffer;
      },
    });

    await expect(persistSharedFiles([file])).resolves.toBeUndefined();
    await expect(consumeSharedFiles()).resolves.toHaveLength(1);
  });
});
