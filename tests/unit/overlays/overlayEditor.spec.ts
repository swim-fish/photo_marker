import { describe, expect, it } from 'vitest';

import {
  createOverlay,
  getContrastStatus,
  moveOverlay,
  moveOverlayByKeyboard,
  removeOverlay,
  reorderOverlays,
  resizeOverlay,
  updateOverlay,
} from '../../../src/domain/overlays/overlayEditor';
import type { OverlayRole, TextOverlay } from '../../../src/domain/overlays/types';

const roles: readonly OverlayRole[] = ['title', 'team', 'coordinate', 'freeform'];

function makeOverlay(role: OverlayRole, id = `overlay-${role}`): TextOverlay {
  return createOverlay({
    id,
    photoId: 'photo-1',
    role,
    content: role === 'freeform' ? '現場標記 🧭\n第二行' : role,
    fontFamily: 'Noto Sans TC',
    fontSize: 0.04,
    textColor: '#ffffff',
    backgroundColor: '#111827',
    x: 0.1,
    y: 0.1,
    width: 0.3,
    height: 0.1,
    order: 0,
  });
}

describe('semantic overlay editor', () => {
  it('creates all explicit overlay roles and preserves Unicode content', () => {
    const overlays = roles.map((role) => makeOverlay(role));

    expect(overlays.map((overlay) => overlay.role)).toEqual(roles);
    expect(overlays.find((overlay) => overlay.role === 'freeform')?.content).toBe(
      '現場標記 🧭\n第二行',
    );
  });

  it('adds, edits, removes, and reorders overlays without losing their semantic identity', () => {
    const initial = roles.map((role, index) => ({ ...makeOverlay(role), order: index }));
    const edited = updateOverlay(initial[0], {
      content: '更新後標題',
      x: 0.95,
      width: 0.5,
    });
    const withoutTeam = removeOverlay(initial, 'overlay-team');
    const reordered = reorderOverlays(withoutTeam, 'overlay-freeform', 0);

    expect(edited).toMatchObject({ content: '更新後標題', x: 0.5, width: 0.5 });
    expect(withoutTeam.some((overlay) => overlay.id === 'overlay-team')).toBe(false);
    expect(reordered[0]).toMatchObject({ id: 'overlay-freeform', order: 0 });
    expect(reordered.map((overlay) => overlay.order)).toEqual([0, 1, 2]);
  });

  it('keeps pointer and keyboard one-percent movement equivalent and clamps resize', () => {
    const overlay = makeOverlay('freeform');
    const pointerMoved = moveOverlay(overlay, { dx: 0.01, dy: 0 });
    const keyboardMoved = moveOverlayByKeyboard(overlay, { key: 'ArrowRight', shiftKey: false });
    const resized = resizeOverlay(overlay, { dw: 0.9, dh: 0.9 });

    expect(pointerMoved).toMatchObject({ x: 0.11, y: 0.1 });
    expect(keyboardMoved.x).toBe(pointerMoved.x);
    expect(keyboardMoved.y).toBe(pointerMoved.y);
    expect(resized.x + resized.width).toBeLessThanOrEqual(1);
    expect(resized.y + resized.height).toBeLessThanOrEqual(1);
  });

  it('reports low contrast as a warning without silently changing user colours', () => {
    expect(getContrastStatus('#ffffff', '#ffffff')).toBe('warning');
    expect(getContrastStatus('#ffffff', '#000000')).toBe('acceptable');
    const overlay = makeOverlay('title');
    const updated = updateOverlay(overlay, {
      textColor: '#ffffff',
      backgroundColor: '#ffffff',
    });
    expect(updated).toMatchObject({
      textColor: '#ffffff',
      backgroundColor: '#ffffff',
      contrastStatus: 'warning',
    });
  });
});
