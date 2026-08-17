import { formatCoordinate } from '../coordinates/formatCoordinate';
import type { CoordinateDisplayFormat, CoordinateRecord } from '../coordinates/types';

export function formatCoordinateOverlay(
  coordinate: CoordinateRecord,
  provenanceLabel: string,
  displayFormat: CoordinateDisplayFormat = coordinate.displayFormat,
): string {
  const formatted = formatCoordinate(coordinate, displayFormat, {
    zone: coordinate.zone,
    precision: coordinate.precision,
  });
  const text = formatted.ok
    ? formatted.value.text
    : `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`;
  return `${provenanceLabel}: ${text}`;
}
