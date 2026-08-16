import { describe, expect, it } from 'vitest';

import {
  clampOverlayGeometry,
  normalizeOverlayGeometry,
  sortOverlaysByOrder,
} from '../../../src/domain/overlays/geometry';

describe('normalized overlay geometry', () => {
  it('clamps an overlay fully inside the closed unit square', () => {
    expect(clampOverlayGeometry({ x: -0.2, y: 0.9, width: 1.4, height: 0.4 })).toEqual({
      x: 0,
      y: 0.6,
      width: 1,
      height: 0.4,
    });
    expect(normalizeOverlayGeometry({ x: Number.NaN, y: 2, width: -1, height: 0.5 })).toEqual({
      x: 0,
      y: 0.5,
      width: 0,
      height: 0.5,
    });
  });

  it('sorts by order and uses the id as a stable tie breaker', () => {
    const overlays = [
      { id: 'b', order: 2 },
      { id: 'c', order: 1 },
      { id: 'a', order: 1 },
    ];

    expect(sortOverlaysByOrder(overlays).map(({ id }) => id)).toEqual(['a', 'c', 'b']);
  });
});
