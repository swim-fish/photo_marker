import { failure, type Result, success } from '../result';

export const MAX_PHOTOS = 20;
export const MAX_PIXEL_AREA = 13_000_000;
export const MAX_DIMENSION = 8192;
export const MAX_BYTES_PER_PHOTO = 32 * 1024 * 1024;
export const MAX_AGGREGATE_BYTES = 640 * 1024 * 1024;

export type PhotoLimitInput = Readonly<{
  bytes?: number;
  sourceBytes?: number;
  width?: number;
  rawWidth?: number;
  height?: number;
  rawHeight?: number;
}>;

export type StorageBudgetOptions = Readonly<{
  storageHeadroomBytes?: number;
}>;

export type PhotoLimitResult = Result<true, 'over-limit'>;

function dimension(input: PhotoLimitInput, key: 'width' | 'height'): number {
  const direct = input[key];
  if (typeof direct === 'number') return direct;
  const raw = input[key === 'width' ? 'rawWidth' : 'rawHeight'];
  return typeof raw === 'number' ? raw : Number.NaN;
}

function bytes(input: PhotoLimitInput): number {
  return input.bytes ?? input.sourceBytes ?? Number.NaN;
}

export function validatePhotoLimits(input: PhotoLimitInput): PhotoLimitResult {
  const size = bytes(input);
  const width = dimension(input, 'width');
  const height = dimension(input, 'height');

  if (
    !Number.isSafeInteger(size) ||
    size < 1 ||
    size > MAX_BYTES_PER_PHOTO ||
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > MAX_DIMENSION ||
    height > MAX_DIMENSION ||
    width * height > MAX_PIXEL_AREA
  ) {
    return failure('over-limit');
  }

  return success(true);
}

export function validatePhotoBatchLimits(
  inputs: readonly PhotoLimitInput[],
  options: StorageBudgetOptions = {},
): PhotoLimitResult {
  if (inputs.length < 1 || inputs.length > MAX_PHOTOS) {
    return failure('over-limit');
  }

  for (const input of inputs) {
    if (!validatePhotoLimits(input).ok) return failure('over-limit');
  }

  const aggregateLimit = Math.min(
    MAX_AGGREGATE_BYTES,
    typeof options.storageHeadroomBytes === 'number' &&
      Number.isFinite(options.storageHeadroomBytes)
      ? Math.floor(options.storageHeadroomBytes * 0.8)
      : MAX_AGGREGATE_BYTES,
  );
  const aggregateBytes = inputs.reduce((total, input) => total + bytes(input), 0);

  return aggregateBytes <= aggregateLimit ? success(true) : failure('over-limit');
}

export const validateBatchLimits = validatePhotoBatchLimits;
