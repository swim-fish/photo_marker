import type { OverlayCorner, OverlayGeometry } from './types';

export const OVERLAY_SAFE_INSET = 0.03;
export const OVERLAY_SAFETY_GAP = 0.01;
export const MAX_ANCHORED_OVERLAY_WIDTH = 0.44;

const SEARCH_STEP = 0.005;

function rounded(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function overlaysOverlap(
  left: OverlayGeometry,
  right: OverlayGeometry,
  gap = OVERLAY_SAFETY_GAP,
): boolean {
  return !(
    left.x + left.width + gap <= right.x ||
    right.x + right.width + gap <= left.x ||
    left.y + left.height + gap <= right.y ||
    right.y + right.height + gap <= left.y
  );
}

export function overlapsAny(
  candidate: OverlayGeometry,
  existing: readonly OverlayGeometry[],
): boolean {
  return existing.some((overlay) => overlaysOverlap(candidate, overlay));
}

export function findCornerPlacement(
  candidate: OverlayGeometry,
  existing: readonly OverlayGeometry[],
  corner: OverlayCorner,
): OverlayGeometry | null {
  const width = Math.min(MAX_ANCHORED_OVERLAY_WIDTH, Math.max(0.01, candidate.width));
  const height = Math.min(1 - OVERLAY_SAFE_INSET * 2, Math.max(0.01, candidate.height));
  const x = corner.endsWith('left') ? OVERLAY_SAFE_INSET : 1 - OVERLAY_SAFE_INSET - width;
  const minimumY = OVERLAY_SAFE_INSET;
  const maximumY = 1 - OVERLAY_SAFE_INSET - height;
  const steps = Math.ceil((maximumY - minimumY) / SEARCH_STEP);
  const startsAtTop = corner.startsWith('top');

  for (let index = 0; index <= steps; index += 1) {
    const offset = Math.min(maximumY - minimumY, index * SEARCH_STEP);
    const y = startsAtTop ? minimumY + offset : maximumY - offset;
    const placement = {
      x: rounded(x),
      y: rounded(y),
      width: rounded(width),
      height: rounded(height),
    };
    if (!overlapsAny(placement, existing)) return placement;
  }
  return null;
}
