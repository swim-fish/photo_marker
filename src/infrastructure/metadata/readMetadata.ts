import { gps as readGps, orientation as readOrientation } from 'exifr';

import type { Wgs84Coordinate } from '../../domain/coordinates/types';
import type { MetadataSummary, PhotoMime, PhotoOrientation } from '../../domain/photos/types';
import { failure, type Result, success } from '../../domain/result';
import { createMetadataSummary, inspectMetadataProfile } from './metadataProfile';

export type ReadMetadataValue = Readonly<{
  mime: PhotoMime;
  rawWidth: number;
  rawHeight: number;
  orientation: PhotoOrientation;
  metadataSummary: MetadataSummary;
}>;

export type ReadMetadataFailure = 'unsupported-format' | 'malformed-metadata' | 'decode-failed';

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

function detectedMime(bytes: Uint8Array): PhotoMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (pngSignature.every((byte, index) => bytes[index] === byte)) return 'image/png';
  return null;
}

function pngDimensions(bytes: Uint8Array): readonly [number, number] | null {
  if (bytes.length < 24 || String.fromCharCode(...bytes.subarray(12, 16)) !== 'IHDR') return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset + 16, 8);
  return [view.getUint32(0), view.getUint32(4)];
}

const sofMarkers = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function jpegDimensions(bytes: Uint8Array): readonly [number, number] | null {
  let offset = 2;
  while (offset + 1 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return null;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) return null;
    if (sofMarkers.has(marker)) {
      if (length < 7) return null;
      return [
        (bytes[offset + 5] << 8) | bytes[offset + 6],
        (bytes[offset + 3] << 8) | bytes[offset + 4],
      ];
    }
    offset += length;
  }
  return null;
}

function validGps(value: unknown): Wgs84Coordinate | null {
  if (!value || typeof value !== 'object') return null;
  const latitude = Reflect.get(value, 'latitude');
  const longitude = Reflect.get(value, 'longitude');
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    (latitude === 0 && longitude === 0)
  ) {
    return null;
  }
  return { latitude, longitude };
}

export async function readMetadata(
  source: Blob,
): Promise<Result<ReadMetadataValue, ReadMetadataFailure>> {
  const bytes = new Uint8Array(await source.arrayBuffer());
  const mime = detectedMime(bytes);
  if (!mime) {
    return source.type === 'image/jpeg' || source.type === 'image/png'
      ? failure('decode-failed')
      : failure('unsupported-format');
  }

  const profile = inspectMetadataProfile(bytes, mime);
  if (profile.malformed) return failure('malformed-metadata');

  const dimensions = mime === 'image/png' ? pngDimensions(bytes) : jpegDimensions(bytes);
  if (!dimensions || dimensions[0] < 1 || dimensions[1] < 1) return failure('decode-failed');

  try {
    const [orientationValue, gpsValue] = await Promise.all([
      mime === 'image/jpeg' ? readOrientation(source) : Promise.resolve(undefined),
      readGps(source),
    ]);
    const orientationPresent = orientationValue !== undefined;
    if (
      orientationValue !== undefined &&
      (!Number.isInteger(orientationValue) || orientationValue < 1 || orientationValue > 8)
    ) {
      return failure('malformed-metadata');
    }
    const orientation = (orientationValue ?? 1) as PhotoOrientation;
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(source, { imageOrientation: 'none' });
        bitmap.close();
      } catch {
        return failure('decode-failed');
      }
    }
    return success({
      mime,
      rawWidth: dimensions[0],
      rawHeight: dimensions[1],
      orientation,
      metadataSummary: createMetadataSummary(profile, validGps(gpsValue), orientationPresent),
    });
  } catch {
    return failure('malformed-metadata');
  }
}
