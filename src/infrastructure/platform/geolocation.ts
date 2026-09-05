import {
  replaceWorkingCoordinate,
  type WorkingCoordinateFailure,
} from '../../domain/coordinates/workingCoordinate';
import type { CoordinateRecord } from '../../domain/coordinates/types';
import { failure, type Result } from '../../domain/result';

export type CurrentLocationOptions = Readonly<{
  id: string;
  photoId: string;
  acquiredAt?: string;
  maxAccuracyMeters: number;
  timeoutMs?: number;
}>;

export type CurrentLocationFailure =
  | WorkingCoordinateFailure
  | 'location-denied'
  | 'location-timeout'
  | 'location-unavailable'
  | 'accuracy-insufficient';

export function requestCurrentLocation(
  geolocation: Geolocation,
  options: CurrentLocationOptions,
): Promise<Result<CoordinateRecord, CurrentLocationFailure>> {
  return new Promise((resolve) => {
    geolocation.getCurrentPosition(
      (position) => {
        if (
          position.coords.accuracy != null &&
          (!Number.isFinite(position.coords.accuracy) ||
            position.coords.accuracy < 0 ||
            position.coords.accuracy > options.maxAccuracyMeters)
        ) {
          resolve(failure('accuracy-insufficient'));
          return;
        }
        resolve(
          replaceWorkingCoordinate(null, {
            id: options.id,
            photoId: options.photoId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            provenance: 'CURRENT_GPS',
            inputFormat: 'DEVICE_WGS84',
            displayFormat: 'WGS84_DD',
            accuracyMeters: position.coords.accuracy,
            acquiredAt: options.acquiredAt ?? new Date(position.timestamp).toISOString(),
          }),
        );
      },
      (error) => {
        const code =
          error.code === 1
            ? 'location-denied'
            : error.code === 3
              ? 'location-timeout'
              : 'location-unavailable';
        resolve(failure(code));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: options.timeoutMs ?? 15_000,
      },
    );
  });
}
