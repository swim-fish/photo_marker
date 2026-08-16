import { clampOverlayGeometry } from '../domain/overlays/geometry';
import type { OverlayGeometry } from '../domain/overlays/types';
import type { PhotoOrientation } from '../domain/photos/types';

export type PixelDimensions = Readonly<{
  width: number;
  height: number;
}>;

export type NormalizedPoint = Readonly<{
  x: number;
  y: number;
}>;

export type PixelRect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export function displayDimensions(
  rawWidth: number,
  rawHeight: number,
  orientation: PhotoOrientation,
): PixelDimensions {
  return orientation >= 5
    ? { width: rawHeight, height: rawWidth }
    : { width: rawWidth, height: rawHeight };
}

export function layoutOverlayRect(
  geometry: OverlayGeometry,
  dimensions: PixelDimensions,
): PixelRect {
  const normalized = clampOverlayGeometry(geometry);
  return {
    x: Math.round(normalized.x * dimensions.width),
    y: Math.round(normalized.y * dimensions.height),
    width: Math.round(normalized.width * dimensions.width),
    height: Math.round(normalized.height * dimensions.height),
  };
}

export function displayPointToRawPoint(
  point: NormalizedPoint,
  orientation: PhotoOrientation,
): NormalizedPoint {
  const { x, y } = point;
  switch (orientation) {
    case 2:
      return { x: 1 - x, y };
    case 3:
      return { x: 1 - x, y: 1 - y };
    case 4:
      return { x, y: 1 - y };
    case 5:
      return { x: y, y: x };
    case 6:
      return { x: y, y: 1 - x };
    case 7:
      return { x: 1 - y, y: 1 - x };
    case 8:
      return { x: 1 - y, y: x };
    default:
      return { x, y };
  }
}

export function rawPointToDisplayPoint(
  point: NormalizedPoint,
  orientation: PhotoOrientation,
): NormalizedPoint {
  const { x, y } = point;
  switch (orientation) {
    case 2:
      return { x: 1 - x, y };
    case 3:
      return { x: 1 - x, y: 1 - y };
    case 4:
      return { x, y: 1 - y };
    case 5:
      return { x: y, y: x };
    case 6:
      return { x: 1 - y, y: x };
    case 7:
      return { x: 1 - y, y: 1 - x };
    case 8:
      return { x: y, y: 1 - x };
    default:
      return { x, y };
  }
}

function rectCorners(rectangle: OverlayGeometry): NormalizedPoint[] {
  return [
    { x: rectangle.x, y: rectangle.y },
    { x: rectangle.x + rectangle.width, y: rectangle.y },
    { x: rectangle.x, y: rectangle.y + rectangle.height },
    { x: rectangle.x + rectangle.width, y: rectangle.y + rectangle.height },
  ];
}

function bounds(points: readonly NormalizedPoint[]): OverlayGeometry {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return clampOverlayGeometry({
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  });
}

export function mapDisplayRectToRaw(
  rectangle: OverlayGeometry,
  rawWidth: number,
  rawHeight: number,
  orientation: PhotoOrientation,
): PixelRect {
  const raw = bounds(
    rectCorners(clampOverlayGeometry(rectangle)).map((point) =>
      displayPointToRawPoint(point, orientation),
    ),
  );
  return {
    x: raw.x * rawWidth,
    y: raw.y * rawHeight,
    width: raw.width * rawWidth,
    height: raw.height * rawHeight,
  };
}

export function mapRawRectToDisplay(
  rectangle: OverlayGeometry,
  rawWidth: number,
  rawHeight: number,
  orientation: PhotoOrientation,
): PixelRect {
  const display = bounds(
    rectCorners(clampOverlayGeometry(rectangle)).map((point) =>
      rawPointToDisplayPoint(point, orientation),
    ),
  );
  const dimensions = displayDimensions(rawWidth, rawHeight, orientation);
  return {
    x: display.x * dimensions.width,
    y: display.y * dimensions.height,
    width: display.width * dimensions.width,
    height: display.height * dimensions.height,
  };
}

export function layoutTextBlock(
  content: string,
  fontSize: number,
  lineHeight = 1.2,
  padding = 0,
): Readonly<{ lines: readonly string[]; width: number; height: number }> {
  const lines = content.split(/\r?\n/);
  const longestLine = Math.max(0, ...lines.map((line) => line.length));
  const safeFontSize = Math.max(0, fontSize);
  const safePadding = Math.max(0, padding);
  return {
    lines,
    width: longestLine * safeFontSize * 0.6 + safePadding * 2,
    height: lines.length * safeFontSize * Math.max(0, lineHeight) + safePadding * 2,
  };
}
