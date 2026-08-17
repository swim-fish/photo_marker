import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import {
  MAX_METADATA_INPUT_BYTES,
  readMetadata,
} from '../../../src/infrastructure/metadata/readMetadata';
import {
  isMetadataOutputWithinLimit,
  MAX_METADATA_OUTPUT_BYTES,
  writeMetadata,
} from '../../../src/infrastructure/metadata/writeMetadata';
import { createPhotoFixtureFile } from '../../helpers/photoFixtures';

const fixtureDirectory = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures/malformed');

const corpus = [
  ['jpeg-segment-overrun.hex', 'image/jpeg'],
  ['jpeg-zero-length.hex', 'image/jpeg'],
  ['png-huge-chunk.hex', 'image/png'],
  ['png-truncated-chunk.hex', 'image/png'],
  ['jpeg-invalid-exif-offset.hex', 'image/jpeg'],
  ['png-invalid-exif-offset.hex', 'image/png'],
] as const;

async function readHexFixture(name: string): Promise<Uint8Array> {
  const hex = (await readFile(resolve(fixtureDirectory, name), 'utf8')).replace(/\s+/g, '');
  return Uint8Array.from(hex.match(/.{2}/g) ?? [], (pair) => Number.parseInt(pair, 16));
}

describe('bounded malformed metadata corpus', () => {
  it('rejects every bounded malformed segment without throwing or echoing bytes', async () => {
    for (const [name, type] of corpus) {
      const bytes = await readHexFixture(name);
      const result = await readMetadata(new File([bytes.buffer as ArrayBuffer], name, { type }));
      expect(result.ok, name).toBe(false);
      if (result.ok) continue;
      expect(['malformed-metadata', 'decode-failed']).toContain(result.error.code);
      expect(JSON.stringify(result)).not.toContain(name);
      expect(JSON.stringify(result)).not.toContain('45786966');
    }
  });

  it('rejects oversized input before requesting an ArrayBuffer allocation', async () => {
    const arrayBuffer = vi.fn(async () => new ArrayBuffer(0));
    const oversized = {
      size: MAX_METADATA_INPUT_BYTES + 1,
      type: 'image/jpeg',
      arrayBuffer,
    } as unknown as Blob;

    await expect(readMetadata(oversized)).resolves.toMatchObject({
      ok: false,
      error: { code: 'over-limit' },
    });
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it('rejects declared dimensions before invoking a browser decoder', async () => {
    const createImageBitmap = vi.fn();
    vi.stubGlobal('createImageBitmap', createImageBitmap);
    const bytes = await readHexFixture('png-dimension-over-limit.hex');

    await expect(
      readMetadata(new File([bytes.buffer as ArrayBuffer], 'huge.png', { type: 'image/png' })),
    ).resolves.toMatchObject({ ok: false, error: { code: 'over-limit' } });
    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it('bounds the final attachment size without allocating the combined output', () => {
    expect(isMetadataOutputWithinLimit([MAX_METADATA_OUTPUT_BYTES])).toBe(true);
    expect(isMetadataOutputWithinLimit([MAX_METADATA_OUTPUT_BYTES, 1])).toBe(false);
    expect(isMetadataOutputWithinLimit([Number.MAX_SAFE_INTEGER, 1])).toBe(false);
  });

  it('rejects oversized rendered metadata output before allocating its bytes', async () => {
    const source = await createPhotoFixtureFile('sample.png');
    const arrayBuffer = vi.fn(async () => new ArrayBuffer(0));
    const oversizedRendered = {
      size: MAX_METADATA_OUTPUT_BYTES + 1,
      type: 'image/png',
      arrayBuffer,
    } as unknown as Blob;

    await expect(
      writeMetadata(
        source,
        {
          sourceMime: 'image/png',
          outputMime: 'image/png',
          metadataMode: 'removeSupported',
        },
        oversizedRendered,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'encode-failed' },
    });
    expect(arrayBuffer).not.toHaveBeenCalled();
  });
});
