import { failure, type Result, success } from '../result';
import type {
  CoordinateDisplayFormat,
  CoordinateInputFormat,
  CoordinateProvenance,
  CoordinateRecord,
  CoordinateZone,
} from './types';

export type WorkingCoordinateInput = Readonly<{
  id: string;
  photoId: string;
  latitude: number;
  longitude: number;
  provenance: CoordinateProvenance;
  inputFormat: CoordinateInputFormat;
  displayFormat: CoordinateDisplayFormat;
  zone?: CoordinateZone | null;
  zoneAutoResolved?: boolean;
  precision?: number | null;
  accuracyMeters?: number | null;
  acquiredAt?: string | null;
}>;

export type WorkingCoordinateFailure = 'out-of-range' | 'invalid-input';

function isValidWgs84(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function replaceWorkingCoordinate(
  previous: CoordinateRecord | null,
  input: WorkingCoordinateInput,
): Result<CoordinateRecord, WorkingCoordinateFailure> {
  void previous;
  if (!isValidWgs84(input.latitude, input.longitude)) return failure('out-of-range');
  if (
    input.provenance === 'CURRENT_GPS' &&
    ((input.accuracyMeters != null &&
      (!Number.isFinite(input.accuracyMeters) || input.accuracyMeters < 0)) ||
      !input.acquiredAt)
  ) {
    return failure('invalid-input');
  }

  return success({
    id: input.id,
    photoId: input.photoId,
    latitude: input.latitude,
    longitude: input.longitude,
    provenance: input.provenance,
    inputFormat: input.inputFormat,
    displayFormat: input.displayFormat,
    zone: input.zone ?? null,
    zoneAutoResolved: input.zoneAutoResolved ?? false,
    precision: input.precision ?? null,
    accuracyMeters: input.accuracyMeters ?? null,
    acquiredAt: input.acquiredAt ?? null,
    coverageStatus: 'available',
    validationStatus: 'valid',
  });
}
