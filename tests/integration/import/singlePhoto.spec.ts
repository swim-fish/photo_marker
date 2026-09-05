import { describe, expect, it } from 'vitest';

import { importPhoto } from '../../../src/domain/photos/importPhoto';
import { createPhotoFixtureFile, readPhotoFixture } from '../../helpers/photoFixtures';

async function sha256(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

describe('single-photo import pipeline', () => {
  it.each(['', 'application/octet-stream'])(
    'imports verified image bytes with provider MIME %j',
    async (type) => {
      for (const name of ['orientation-1.jpg', 'sample.png'] as const) {
        const source = await createPhotoFixtureFile(name);
        const file = new File([await source.arrayBuffer()], name, { type });
        const result = await importPhoto(file, {
          id: 'provider-photo',
          sessionId: 'provider-session',
        });
        expect(result.ok).toBe(true);
        if (!result.ok) continue;
        expect(result.value.sourceMime).toBe(source.type);
        expect(await sha256(result.value.sourceBlob)).toBe(await sha256(file));
      }
    },
  );

  it.each(['', 'application/octet-stream'])(
    'rejects non-image bytes with provider MIME %j',
    async (type) => {
      const result = await importPhoto(new File(['not a photo'], 'fake.jpg', { type }), {
        id: 'invalid-provider-photo',
        sessionId: 'provider-session',
      });
      expect(result).toMatchObject({ ok: false, error: { code: 'unsupported-format' } });
    },
  );

  it('imports valid JPEG and PNG files through one source contract', async () => {
    const jpeg = await createPhotoFixtureFile('orientation-6.jpg');
    const png = await createPhotoFixtureFile('sample.png');

    const jpegResult = await importPhoto(jpeg, { id: 'photo-jpeg', sessionId: 'session-1' });
    const pngResult = await importPhoto(png, { id: 'photo-png', sessionId: 'session-1' });

    expect(jpegResult.ok).toBe(true);
    expect(pngResult.ok).toBe(true);
    if (!jpegResult.ok || !pngResult.ok) return;
    expect(jpegResult.value).toMatchObject({
      id: 'photo-jpeg',
      sourceMime: 'image/jpeg',
      orientation: 6,
    });
    expect(pngResult.value).toMatchObject({
      id: 'photo-png',
      sourceMime: 'image/png',
      rawWidth: 4,
      rawHeight: 3,
    });
  });

  it('rejects a declared PNG whose magic bytes are JPEG', async () => {
    const fixture = await readPhotoFixture('orientation-1.jpg');
    const mismatched = new File([fixture.buffer as ArrayBuffer], 'not-a-png.png', {
      type: 'image/png',
    });

    const result = await importPhoto(mismatched, { id: 'photo-invalid', sessionId: 'session-1' });

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'unsupported-format' },
    });
  });

  it('records a source digest while leaving the selected File byte-for-byte unchanged', async () => {
    const source = await createPhotoFixtureFile('orientation-1.jpg');
    const before = await sha256(source);
    const result = await importPhoto(source, { id: 'photo-hash', sessionId: 'session-1' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.sourceDigest).toBe(before);
    expect(await sha256(source)).toBe(before);
    expect(result.value.sourceBlob).not.toBe(source);
  });

  it('returns a typed failure for an undecodable source instead of storing it', async () => {
    const corrupt = new File([new Uint8Array([0, 1, 2, 3, 4])], 'corrupt.jpg', {
      type: 'image/jpeg',
    });

    const result = await importPhoto(corrupt, { id: 'photo-corrupt', sessionId: 'session-1' });

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'decode-failed' },
    });
  });
});
