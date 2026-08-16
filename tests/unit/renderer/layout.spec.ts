import { describe, expect, it } from 'vitest';

import {
  displayDimensions,
  displayPointToRawPoint,
  layoutOverlayRect,
  mapDisplayRectToRaw,
} from '../../../src/renderer/layout';

describe('oriented image layout', () => {
  it('swaps display dimensions for orientations 5 through 8', () => {
    expect(displayDimensions(400, 300, 1)).toEqual({ width: 400, height: 300 });
    expect(displayDimensions(400, 300, 6)).toEqual({ width: 300, height: 400 });
    expect(displayDimensions(400, 300, 8)).toEqual({ width: 300, height: 400 });
  });

  it('maps normalized display overlays into display pixels', () => {
    expect(
      layoutOverlayRect({ x: 0.1, y: 0.2, width: 0.5, height: 0.25 }, { width: 300, height: 400 }),
    ).toEqual({
      x: 30,
      y: 80,
      width: 150,
      height: 100,
    });
  });

  it('inverse maps a display point and rectangle through EXIF orientation 6', () => {
    expect(displayPointToRawPoint({ x: 0.25, y: 0.75 }, 6)).toEqual({ x: 0.75, y: 0.75 });
    expect(mapDisplayRectToRaw({ x: 0, y: 0, width: 0.25, height: 0.5 }, 400, 300, 6)).toEqual({
      x: 0,
      y: 225,
      width: 200,
      height: 75,
    });
  });
});
