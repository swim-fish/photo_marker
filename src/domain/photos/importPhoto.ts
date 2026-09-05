import { displayDimensions } from '../../renderer/layout';
import { readMetadata } from '../../infrastructure/metadata/readMetadata';
import { hashBlob } from '../../infrastructure/platform/hashBlob';
import { failure, type Result, success } from '../result';
import { MAX_BYTES_PER_PHOTO, validatePhotoLimits } from './photoLimits';
import type { SourcePhoto } from './types';

export type ImportPhotoOptions = Readonly<{
  id: string;
  sessionId: string;
}>;

export type ImportPhotoFailure =
  'unsupported-format' | 'over-limit' | 'malformed-metadata' | 'decode-failed';

export async function importPhoto(
  file: File,
  options: ImportPhotoOptions,
): Promise<Result<SourcePhoto, ImportPhotoFailure>> {
  if (file.size < 1 || file.size > MAX_BYTES_PER_PHOTO) return failure('over-limit');
  const metadata = await readMetadata(file);
  if (!metadata.ok) return failure(metadata.error.code as ImportPhotoFailure);
  // Document providers may omit MIME or return a generic binary type.
  // Only accept those fallbacks after validating the actual JPEG/PNG bytes.
  if (file.type && file.type !== 'application/octet-stream' && file.type !== metadata.value.mime)
    return failure('unsupported-format');

  const limit = validatePhotoLimits({
    bytes: file.size,
    width: metadata.value.rawWidth,
    height: metadata.value.rawHeight,
  });
  if (!limit.ok) return failure('over-limit');

  const sourceBlob = file.slice(0, file.size, metadata.value.mime);
  const display = displayDimensions(
    metadata.value.rawWidth,
    metadata.value.rawHeight,
    metadata.value.orientation,
  );

  return success({
    id: options.id,
    sessionId: options.sessionId,
    sourceBlob,
    sourceName: file.name,
    sourceMime: metadata.value.mime,
    sourceBytes: file.size,
    sourceDigest: await hashBlob(file),
    rawWidth: metadata.value.rawWidth,
    rawHeight: metadata.value.rawHeight,
    displayWidth: display.width,
    displayHeight: display.height,
    orientation: metadata.value.orientation,
    metadataSummary: metadata.value.metadataSummary,
    coordinateId: null,
    overlayIds: [],
    reviewStatus: metadata.value.metadataSummary.captureGps ? 'ready' : 'missingCoordinate',
    failureCode: null,
  });
}
