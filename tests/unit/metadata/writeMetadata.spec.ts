import { describe, expect, it } from 'vitest';

import { readMetadata } from '../../../src/infrastructure/metadata/readMetadata';
import { writeMetadata } from '../../../src/infrastructure/metadata/writeMetadata';
import { readPhotoFixture } from '../../helpers/photoFixtures';

type PhotoMime = 'image/jpeg' | 'image/png';
type MetadataMode = 'preserveSupported' | 'removeSupported';

function metadataRequest(sourceMime: PhotoMime, outputMime: PhotoMime, metadataMode: MetadataMode) {
  return { sourceMime, outputMime, metadataMode } as const;
}

function concatBytes(...parts: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)));
  return chunk;
}

async function createGpsJpegFixture(): Promise<File> {
  const source = await readPhotoFixture('orientation-6.jpg');
  const tiff = new Uint8Array(140);
  const view = new DataView(tiff.buffer);

  tiff.set([0x49, 0x49], 0);
  view.setUint16(2, 42, true);
  view.setUint32(4, 8, true);
  view.setUint16(8, 2, true);

  view.setUint16(10, 0x0112, true);
  view.setUint16(12, 3, true);
  view.setUint32(14, 1, true);
  view.setUint16(18, 6, true);

  view.setUint16(22, 0x8825, true);
  view.setUint16(24, 4, true);
  view.setUint32(26, 1, true);
  view.setUint32(30, 38, true);

  view.setUint16(38, 4, true);
  view.setUint16(40, 0x0001, true);
  view.setUint16(42, 2, true);
  view.setUint32(44, 2, true);
  tiff.set([0x4e, 0x00], 48);

  view.setUint16(52, 0x0002, true);
  view.setUint16(54, 5, true);
  view.setUint32(56, 3, true);
  view.setUint32(60, 92, true);

  view.setUint16(64, 0x0003, true);
  view.setUint16(66, 2, true);
  view.setUint32(68, 2, true);
  tiff.set([0x45, 0x00], 72);

  view.setUint16(76, 0x0004, true);
  view.setUint16(78, 5, true);
  view.setUint32(80, 3, true);
  view.setUint32(84, 116, true);

  view.setUint32(92, 1, true);
  view.setUint32(96, 1, true);
  view.setUint32(100, 30, true);
  view.setUint32(104, 1, true);
  view.setUint32(108, 0, true);
  view.setUint32(112, 1, true);

  view.setUint32(116, 2, true);
  view.setUint32(120, 1, true);
  view.setUint32(124, 30, true);
  view.setUint32(128, 1, true);
  view.setUint32(132, 0, true);
  view.setUint32(136, 1, true);

  const payload = concatBytes(new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]), tiff);
  const segment = new Uint8Array(4 + payload.length);
  const segmentView = new DataView(segment.buffer);
  segmentView.setUint16(0, 0xffe1);
  segmentView.setUint16(2, payload.length + 2);
  segment.set(payload, 4);

  const bytes = concatBytes(source.subarray(0, 2), segment, source.subarray(2));
  return new File([bytes.buffer as ArrayBuffer], 'gps.jpg', { type: 'image/jpeg' });
}

async function createMetadataPngFixture(): Promise<File> {
  const source = await readPhotoFixture('sample.png');
  const iendOffset = source.length - 12;
  const exif = new Uint8Array([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00]);
  const text = new TextEncoder().encode('fixture\0offline');
  const phys = new Uint8Array(9);
  const physView = new DataView(phys.buffer);
  physView.setUint32(0, 3780);
  physView.setUint32(4, 3780);
  phys[8] = 1;
  const withMetadata = concatBytes(
    source.subarray(0, iendOffset),
    pngChunk('eXIf', exif),
    pngChunk('tEXt', text),
    pngChunk('pHYs', phys),
    source.subarray(iendOffset),
  );
  return new File([withMetadata.buffer as ArrayBuffer], 'metadata.png', { type: 'image/png' });
}

async function outputBlob(result: Awaited<ReturnType<typeof writeMetadata>>): Promise<Blob> {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('Expected metadata writing to succeed.');
  expect(result.value).toBeInstanceOf(Blob);
  return result.value;
}

describe('safe metadata writing', () => {
  it('preserves JPEG EXIF/JFIF and capture GPS without applying a working-coordinate change', async () => {
    const source = await createGpsJpegFixture();
    const before = await readMetadata(source);
    expect(before.ok).toBe(true);
    if (!before.ok) return;
    expect(before.value.metadataSummary.captureGps).toEqual({ latitude: 1.5, longitude: 2.5 });

    const output = await outputBlob(
      await writeMetadata(source, metadataRequest('image/jpeg', 'image/jpeg', 'preserveSupported')),
    );
    expect(output.type).toBe('image/jpeg');

    const after = await readMetadata(output);
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.value.orientation).toBe(6);
    expect(after.value.metadataSummary.groups).toEqual(expect.arrayContaining(['EXIF', 'JFIF']));
    expect(after.value.metadataSummary.captureGps).toEqual(before.value.metadataSummary.captureGps);
    expect(after.value.metadataSummary.groups).not.toContain('ICC');
    expect(after.value.metadataSummary.groups).not.toContain('MPF');
  });

  it('preserves and explicitly removes the supported PNG metadata profile', async () => {
    const source = await createMetadataPngFixture();
    const before = await readMetadata(source);
    expect(before.ok).toBe(true);
    if (!before.ok) return;
    expect(before.value.metadataSummary.groups).toEqual(
      expect.arrayContaining(['eXIf', 'text', 'pHYs']),
    );

    const preserved = await outputBlob(
      await writeMetadata(source, metadataRequest('image/png', 'image/png', 'preserveSupported')),
    );
    const preservedMetadata = await readMetadata(preserved);
    expect(preservedMetadata.ok).toBe(true);
    if (!preservedMetadata.ok) return;
    expect(preservedMetadata.value.metadataSummary.groups).toEqual(
      expect.arrayContaining(['eXIf', 'text', 'pHYs']),
    );

    const removed = await outputBlob(
      await writeMetadata(source, metadataRequest('image/png', 'image/png', 'removeSupported')),
    );
    const removedMetadata = await readMetadata(removed);
    expect(removedMetadata.ok).toBe(true);
    if (!removedMetadata.ok) return;
    expect(removedMetadata.value.metadataSummary.groups).not.toEqual(
      expect.arrayContaining(['eXIf', 'text', 'pHYs']),
    );
    expect(removedMetadata.value.metadataSummary.captureGps).toBeNull();
  });

  it('blocks cross-format or malformed preservation instead of silently stripping metadata', async () => {
    const source = await createGpsJpegFixture();
    const crossFormat = await writeMetadata(
      source,
      metadataRequest('image/jpeg', 'image/png', 'preserveSupported'),
    );
    expect(crossFormat).toMatchObject({
      ok: false,
      error: { code: 'metadata-preservation-unavailable' },
    });

    const malformed = new File(
      [new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x40, 0x45, 0x78, 0x69, 0x66])],
      'malformed.jpg',
      { type: 'image/jpeg' },
    );
    const malformedResult = await writeMetadata(
      malformed,
      metadataRequest('image/jpeg', 'image/jpeg', 'preserveSupported'),
    );
    expect(malformedResult).toMatchObject({
      ok: false,
      error: { code: 'metadata-preservation-unavailable' },
    });
  });

  it('removes JPEG supported metadata and capture GPS only when removal is explicit', async () => {
    const source = await createGpsJpegFixture();
    const output = await outputBlob(
      await writeMetadata(source, metadataRequest('image/jpeg', 'image/jpeg', 'removeSupported')),
    );
    const metadata = await readMetadata(output);
    expect(metadata.ok).toBe(true);
    if (!metadata.ok) return;
    expect(metadata.value.metadataSummary.groups).not.toContain('EXIF');
    expect(metadata.value.metadataSummary.groups).not.toContain('JFIF');
    expect(metadata.value.metadataSummary.captureGps).toBeNull();
    expect(metadata.value.orientation).toBe(1);
  });
});
