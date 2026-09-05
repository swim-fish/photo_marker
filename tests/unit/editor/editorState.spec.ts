import { describe, expect, it } from 'vitest';
import { beginSettings, commitSettings } from '../../../src/domain/editor/editorState';
import { isLegalSessionTransition } from '../../../src/domain/drafts/editingSession';
describe('editor transactions', () => {
  it('copies pending values and rejects stale photo or revision', () => {
    const applied = { text: 'before' };
    const pending = beginSettings('a', 2, applied);
    pending.value.text = 'after';
    expect(applied.text).toBe('before');
    expect(commitSettings(pending, 'b', 2)).toBeNull();
    expect(commitSettings(pending, 'a', 3)).toBeNull();
    expect(commitSettings(pending, 'a', 2)).toEqual({ text: 'after' });
  });
  it('allows returning from export review and canceling export', () => {
    expect(isLegalSessionTransition('reviewing', 'editing')).toBe(true);
    expect(isLegalSessionTransition('exporting', 'reviewing')).toBe(true);
  });
});
