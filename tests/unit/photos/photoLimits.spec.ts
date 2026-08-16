import { describe, expect, it } from 'vitest';

import {
  MAX_BYTES_PER_PHOTO,
  MAX_DIMENSION,
  MAX_PHOTOS,
  MAX_PIXEL_AREA,
  validatePhotoBatchLimits,
  validatePhotoLimits,
} from '../../../src/domain/photos/photoLimits';

const supportedPhoto = { bytes: 1024, width: 4032, height: 3024 };

describe('photo intake limits', () => {
  it('accepts a representative supported photo and a 20-photo batch', () => {
    expect(validatePhotoLimits(supportedPhoto).ok).toBe(true);
    expect(
      validatePhotoBatchLimits(Array.from({ length: MAX_PHOTOS }, () => supportedPhoto)).ok,
    ).toBe(true);
  });

  it('rejects each per-photo boundary violation with a stable code', () => {
    expect(
      validatePhotoLimits({ ...supportedPhoto, bytes: MAX_BYTES_PER_PHOTO + 1 }),
    ).toMatchObject({
      ok: false,
      error: { code: 'over-limit' },
    });
    expect(validatePhotoLimits({ ...supportedPhoto, width: MAX_DIMENSION + 1 })).toMatchObject({
      ok: false,
      error: { code: 'over-limit' },
    });
    expect(
      validatePhotoLimits({ ...supportedPhoto, width: MAX_PIXEL_AREA, height: 2 }),
    ).toMatchObject({
      ok: false,
      error: { code: 'over-limit' },
    });
  });

  it('rejects a batch over the count or aggregate storage budget', () => {
    expect(
      validatePhotoBatchLimits(Array.from({ length: MAX_PHOTOS + 1 }, () => supportedPhoto)),
    ).toMatchObject({ ok: false, error: { code: 'over-limit' } });

    const photos = [
      { ...supportedPhoto, bytes: 900 },
      { ...supportedPhoto, bytes: 900 },
    ];
    expect(validatePhotoBatchLimits(photos, { storageHeadroomBytes: 2_000 })).toMatchObject({
      ok: false,
      error: { code: 'over-limit' },
    });
  });
});
