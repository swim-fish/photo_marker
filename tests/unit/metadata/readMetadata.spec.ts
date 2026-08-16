import { describe, expect, it } from 'vitest';

import { readMetadata } from '../../../src/infrastructure/metadata/readMetadata';
import { createPhotoFixtureFile, orientationFixtureNames } from '../../helpers/photoFixtures';

describe('bounded photo metadata reading', () => {
  it('reads the PNG signature and dimensions without exposing source bytes', async () => {
    const result = await readMetadata(await createPhotoFixtureFile('sample.png'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      mime: 'image/png',
      rawWidth: 4,
      rawHeight: 3,
      orientation: 1,
    });
    expect(JSON.stringify(result)).not.toContain('89504e47');
  });

  it('reads every EXIF orientation value from the deterministic JPEG fixtures', async () => {
    for (const [index, name] of orientationFixtureNames.entries()) {
      const result = await readMetadata(await createPhotoFixtureFile(name));

      expect(result.ok, name).toBe(true);
      if (!result.ok) continue;
      expect(result.value.orientation, name).toBe((index + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8);
      expect(result.value.rawWidth, name).toBeGreaterThan(0);
      expect(result.value.rawHeight, name).toBeGreaterThan(0);
    }
  });

  it('returns a typed malformed-metadata result for a truncated APP1 segment', async () => {
    const malformed = new File(
      [new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x40, 0x45, 0x78, 0x69, 0x66])],
      'truncated.jpg',
      { type: 'image/jpeg' },
    );

    const result = await readMetadata(malformed);

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'malformed-metadata' },
    });
  });
});
