import { formatCoordinate } from '../coordinates/formatCoordinate';
import type { CoordinateRecord } from '../coordinates/types';

export function formatCoordinateOverlay(
  coordinate: CoordinateRecord,
  provenanceLabel: string,
): string {
  const formatted = formatCoordinate(coordinate, coordinate.displayFormat, {
    zone: coordinate.zone,
    precision: coordinate.precision,
  });
  const text = formatted.ok
    ? formatted.value.text
    : `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`;
  return `${provenanceLabel}: ${text}`;
}
