import { clampOverlayGeometry, normalizeOverlayCollection } from './geometry';
import type { ContrastStatus, RgbaColor, TextOverlay } from './types';

export type CreateOverlayInput = Omit<TextOverlay, 'contrastStatus' | 'padding' | 'lineHeight'> &
  Partial<Pick<TextOverlay, 'padding' | 'lineHeight'>>;

export type OverlayUpdate = Partial<Omit<TextOverlay, 'id' | 'photoId' | 'contrastStatus'>>;

export type OverlayDelta = Readonly<{
  dx: number;
  dy: number;
}>;

export type OverlayResizeDelta = Readonly<{
  dw: number;
  dh: number;
}>;

function colorChannels(color: RgbaColor): readonly [number, number, number, number] | null {
  if (typeof color !== 'string') {
    return [color.red, color.green, color.blue, color.alpha];
  }
  const value = color.trim();
  const short = /^#([0-9a-f]{3}|[0-9a-f]{4})$/i.exec(value)?.[1];
  if (short) {
    const channels = [...short].map((digit) => Number.parseInt(`${digit}${digit}`, 16));
    return [channels[0], channels[1], channels[2], (channels[3] ?? 255) / 255];
  }
  const long = /^#([0-9a-f]{6}|[0-9a-f]{8})$/i.exec(value)?.[1];
  if (!long) return null;
  return [
    Number.parseInt(long.slice(0, 2), 16),
    Number.parseInt(long.slice(2, 4), 16),
    Number.parseInt(long.slice(4, 6), 16),
    long.length === 8 ? Number.parseInt(long.slice(6, 8), 16) / 255 : 1,
  ];
}

function relativeLuminance(color: RgbaColor): number | null {
  const channels = colorChannels(color);
  if (!channels) return null;
  const linear = channels.slice(0, 3).map((channel) => {
    const value = Math.min(255, Math.max(0, channel)) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function getContrastStatus(
  textColor: RgbaColor,
  backgroundColor: RgbaColor,
): ContrastStatus {
  const text = relativeLuminance(textColor);
  const background = relativeLuminance(backgroundColor);
  if (text === null || background === null) return 'warning';
  const ratio = (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
  return ratio >= 4.5 ? 'acceptable' : 'warning';
}

export function createOverlay(input: CreateOverlayInput): TextOverlay {
  const geometry = clampOverlayGeometry(input);
  return {
    ...input,
    ...geometry,
    padding: Math.max(0, input.padding ?? 0.01),
    lineHeight: Math.max(0, input.lineHeight ?? 1.2),
    contrastStatus: getContrastStatus(input.textColor, input.backgroundColor),
  };
}

export function updateOverlay(overlay: TextOverlay, update: OverlayUpdate): TextOverlay {
  return createOverlay({ ...overlay, ...update });
}

export function removeOverlay(overlays: readonly TextOverlay[], overlayId: string): TextOverlay[] {
  return normalizeOverlayCollection(overlays.filter((overlay) => overlay.id !== overlayId));
}

export function reorderOverlays(
  overlays: readonly TextOverlay[],
  overlayId: string,
  targetIndex: number,
): TextOverlay[] {
  const current = [...overlays].sort((left, right) => left.order - right.order);
  const sourceIndex = current.findIndex((overlay) => overlay.id === overlayId);
  if (sourceIndex < 0) return normalizeOverlayCollection(current);
  const [moved] = current.splice(sourceIndex, 1);
  current.splice(Math.min(current.length, Math.max(0, Math.trunc(targetIndex))), 0, moved);
  return current.map((overlay, order) => ({
    ...overlay,
    ...clampOverlayGeometry(overlay),
    order,
  }));
}

export function moveOverlay(overlay: TextOverlay, delta: OverlayDelta): TextOverlay {
  return updateOverlay(overlay, {
    x: overlay.x + delta.dx,
    y: overlay.y + delta.dy,
  });
}

export function moveOverlayByKeyboard(
  overlay: TextOverlay,
  event: Readonly<{ key: string; shiftKey?: boolean }>,
): TextOverlay {
  const step = event.shiftKey ? 0.05 : 0.01;
  const deltas: Readonly<Record<string, OverlayDelta>> = {
    ArrowLeft: { dx: -step, dy: 0 },
    ArrowRight: { dx: step, dy: 0 },
    ArrowUp: { dx: 0, dy: -step },
    ArrowDown: { dx: 0, dy: step },
  };
  return deltas[event.key] ? moveOverlay(overlay, deltas[event.key]) : overlay;
}

export function resizeOverlay(overlay: TextOverlay, delta: OverlayResizeDelta): TextOverlay {
  return updateOverlay(overlay, {
    width: Math.max(0.01, overlay.width + delta.dw),
    height: Math.max(0.01, overlay.height + delta.dh),
  });
}
