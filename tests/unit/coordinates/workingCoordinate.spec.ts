import { describe, expect, it } from 'vitest';

import {
  replaceWorkingCoordinate,
  type WorkingCoordinateInput,
} from '../../../src/domain/coordinates/workingCoordinate';
import { requestCurrentLocation } from '../../../src/infrastructure/platform/geolocation';

const captureInput: WorkingCoordinateInput = {
  id: 'coordinate-capture',
  photoId: 'photo-1',
  latitude: 25.033,
  longitude: 121.5654,
  provenance: 'CAPTURE_METADATA',
  inputFormat: 'WGS84_DD',
  displayFormat: 'WGS84_DD',
};

const position = {
  coords: {
    latitude: 25.04,
    longitude: 121.56,
    accuracy: 8,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.parse('2026-08-17T01:00:00.000Z'),
};

describe('working-coordinate provenance and validation', () => {
  it('accepts capture metadata, then replaces it with immutable manual provenance', () => {
    const capture = replaceWorkingCoordinate(null, captureInput);
    expect(capture.ok).toBe(true);
    if (!capture.ok) return;

    const manual = replaceWorkingCoordinate(capture.value, {
      ...captureInput,
      id: 'coordinate-manual',
      latitude: 24.1477,
      longitude: 120.6736,
      provenance: 'MANUAL_INPUT',
    });

    expect(manual.ok).toBe(true);
    if (!manual.ok) return;
    expect(manual.value.provenance).toBe('MANUAL_INPUT');
    expect(manual.value.latitude).toBe(24.1477);
    expect(capture.value.provenance).toBe('CAPTURE_METADATA');
    expect(capture.value.latitude).toBe(25.033);
  });

  it('rejects out-of-range input without mutating the last valid coordinate', () => {
    const previous = replaceWorkingCoordinate(null, captureInput);
    expect(previous.ok).toBe(true);
    if (!previous.ok) return;

    const invalid = replaceWorkingCoordinate(previous.value, {
      ...captureInput,
      id: 'coordinate-invalid',
      latitude: 91,
    });

    expect(invalid).toMatchObject({
      ok: false,
      error: { code: 'out-of-range' },
    });
    expect(previous.value.latitude).toBe(25.033);
  });
});

describe('explicit one-shot current-device location', () => {
  it('requests location only when called and labels an accepted result CURRENT_GPS', async () => {
    let calls = 0;
    const geolocation = {
      getCurrentPosition(onSuccess: (value: typeof position) => void) {
        calls += 1;
        onSuccess(position);
      },
    } as unknown as Geolocation;

    const result = await requestCurrentLocation(geolocation, {
      id: 'coordinate-current',
      photoId: 'photo-1',
      acquiredAt: '2026-08-17T01:00:00.000Z',
      maxAccuracyMeters: 25,
    });

    expect(calls).toBe(1);
    expect(result).toMatchObject({ ok: true, value: { provenance: 'CURRENT_GPS' } });
    if (!result.ok) return;
    expect(result.value.accuracyMeters).toBe(8);
    expect(result.value.acquiredAt).toBe('2026-08-17T01:00:00.000Z');
  });

  it('maps permission denial and timeout to typed failures', async () => {
    const error = (code: 1 | 3): GeolocationPositionError =>
      ({ code, message: 'platform detail must not leak' }) as GeolocationPositionError;
    const denied = {
      getCurrentPosition: (_onSuccess: PositionCallback, onError: PositionErrorCallback) =>
        onError(error(1)),
    } as unknown as Geolocation;
    const timedOut = {
      getCurrentPosition: (_onSuccess: PositionCallback, onError: PositionErrorCallback) =>
        onError(error(3)),
    } as unknown as Geolocation;

    await expect(
      requestCurrentLocation(denied, { id: 'denied', photoId: 'photo-1', maxAccuracyMeters: 25 }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'location-denied' } });
    await expect(
      requestCurrentLocation(timedOut, {
        id: 'timeout',
        photoId: 'photo-1',
        maxAccuracyMeters: 25,
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'location-timeout' } });
  });

  it('requires explicit review when reported accuracy exceeds the accepted threshold', async () => {
    const lowConfidence = {
      ...position,
      coords: { ...position.coords, accuracy: 250 },
    };
    const geolocation = {
      getCurrentPosition: (onSuccess: PositionCallback) =>
        onSuccess(lowConfidence as GeolocationPosition),
    } as unknown as Geolocation;

    await expect(
      requestCurrentLocation(geolocation, {
        id: 'inaccurate',
        photoId: 'photo-1',
        maxAccuracyMeters: 25,
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'accuracy-insufficient' } });
  });
});
