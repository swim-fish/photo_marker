import { describe, expect, it, vi } from 'vitest';

import { createDraftService } from '../../../src/domain/drafts/draftService';
import type { DraftSnapshot } from '../../../src/infrastructure/storage/draftRepository';

function snapshot(revision: number): DraftSnapshot {
  return { session: { id: 'race-session', revision } } as unknown as DraftSnapshot;
}

describe('DraftService concurrent flush', () => {
  it('drains the newest pending revision after an in-flight save', async () => {
    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => (releaseFirst = resolve));
    const save = vi.fn(async (value: DraftSnapshot) => {
      if (value.session.revision === 1) await firstGate;
      return {
        ok: true as const,
        value: {
          sessionId: value.session.id,
          revision: value.session.revision,
          persistenceStatus: 'persistent' as const,
        },
      };
    });
    const service = createDraftService({
      repository: {
        save,
        restore: vi.fn(),
        restoreLatest: vi.fn(),
        cleanup: vi.fn(),
      },
      debounceMs: 0,
    });

    service.scheduleSave(snapshot(1));
    const firstFlush = service.flush();
    service.scheduleSave(snapshot(2));
    const latestFlush = service.flush();
    releaseFirst?.();

    await expect(firstFlush).resolves.toMatchObject({ value: { revision: 2 } });
    await expect(latestFlush).resolves.toMatchObject({ value: { revision: 2 } });
    expect(save.mock.calls.map(([value]) => value.session.revision)).toEqual([1, 2]);
  });
});
