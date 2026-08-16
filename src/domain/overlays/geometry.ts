import type { OverlayGeometry, TextOverlay } from './types';

export type OrderedOverlay = Readonly<{
  id?: string;
  order: number;
}>;

export function clampNormalized(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function clampOverlayGeometry(geometry: OverlayGeometry): OverlayGeometry {
  const width = clampNormalized(geometry.width);
  const height = clampNormalized(geometry.height);
  const x = Math.min(1 - width, clampNormalized(geometry.x));
  const y = Math.min(1 - height, clampNormalized(geometry.y));
  return { x, y, width, height };
}

export const normalizeOverlayGeometry = clampOverlayGeometry;
export const clampNormalizedGeometry = clampOverlayGeometry;

export function sortOverlaysByOrder<T extends OrderedOverlay>(overlays: readonly T[]): T[] {
  return [...overlays].sort((left, right) => {
    const orderDifference = left.order - right.order;
    if (orderDifference !== 0) return orderDifference;
    return (left.id ?? '').localeCompare(right.id ?? '');
  });
}

export function normalizeOverlayCollection(overlays: readonly TextOverlay[]): TextOverlay[] {
  return sortOverlaysByOrder(overlays).map((overlay, order) => ({
    ...overlay,
    ...clampOverlayGeometry(overlay),
    order,
  }));
}
