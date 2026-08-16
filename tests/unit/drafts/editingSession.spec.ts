import { describe, expect, it } from 'vitest';

import {
  createEditingSession,
  editingSessionReducer,
  isLegalSessionTransition,
} from '../../../src/domain/drafts/editingSession';
import {
  selectActivePhotoId,
  selectCanReviewExport,
  selectIsLocallySaved,
} from '../../../src/domain/drafts/selectors';

const session = createEditingSession({
  id: 'session-1',
  photoIds: ['photo-a', 'photo-b'],
  now: '2026-08-17T00:00:00.000Z',
});

describe('editing-session reducer', () => {
  it('starts in creating state and increments revision for completed interactions', () => {
    expect(session).toMatchObject({
      status: 'creating',
      revision: 0,
      activePhotoId: 'photo-a',
      lastPersistedRevision: 0,
    });

    const editing = editingSessionReducer(session, { type: 'transition', status: 'editing' });
    expect(editing.status).toBe('editing');
    expect(editing.revision).toBe(1);
    expect(editing.updatedAt).not.toBe(session.updatedAt);
  });

  it('changes only to a photo belonging to the session and increments once', () => {
    const editing = editingSessionReducer(session, { type: 'transition', status: 'editing' });
    const selected = editingSessionReducer(editing, {
      type: 'set-active-photo',
      photoId: 'photo-b',
    });
    expect(selected.activePhotoId).toBe('photo-b');
    expect(selected.revision).toBe(2);

    const unchanged = editingSessionReducer(selected, {
      type: 'set-active-photo',
      photoId: 'unknown',
    });
    expect(unchanged).toBe(selected);
    expect(unchanged.revision).toBe(2);
    expect(selectActivePhotoId(selected)).toBe('photo-b');
    expect(selectIsLocallySaved(selected)).toBe(false);
  });

  it('enforces legal status transitions and terminal states', () => {
    expect(isLegalSessionTransition('creating', 'editing')).toBe(true);
    expect(isLegalSessionTransition('creating', 'exporting')).toBe(false);
    expect(isLegalSessionTransition('editing', 'editing')).toBe(false);

    const editing = editingSessionReducer(session, { type: 'transition', status: 'editing' });
    const illegal = editingSessionReducer(editing, { type: 'transition', status: 'completed' });
    expect(illegal).toBe(editing);

    const discarded = editingSessionReducer(editing, { type: 'transition', status: 'discarded' });
    expect(discarded.status).toBe('discarded');
    expect(editingSessionReducer(discarded, { type: 'transition', status: 'editing' })).toBe(
      discarded,
    );
    expect(selectCanReviewExport(editing)).toBe(false);
    expect(
      selectCanReviewExport(
        editingSessionReducer(editing, { type: 'transition', status: 'reviewing' }),
      ),
    ).toBe(true);
  });

  it('rejects duplicate photo IDs instead of silently deduplicating them', () => {
    expect(() =>
      createEditingSession({ id: 'duplicate-session', photoIds: ['photo-a', 'photo-a'] }),
    ).toThrow(/unique/i);
  });

  it('does not regress a newer persisted revision', () => {
    const editing = editingSessionReducer(session, { type: 'transition', status: 'editing' });
    const selected = editingSessionReducer(editing, {
      type: 'set-active-photo',
      photoId: 'photo-b',
    });
    const persisted = editingSessionReducer(selected, { type: 'mark-persisted' });
    expect(persisted.lastPersistedRevision).toBe(2);
    expect(selectIsLocallySaved(persisted)).toBe(true);

    const regressed = editingSessionReducer(persisted, {
      type: 'mark-persisted',
      revision: 1,
    });
    expect(regressed).toBe(persisted);
    expect(regressed.lastPersistedRevision).toBe(2);
  });
});
