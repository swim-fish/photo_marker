import { Buffer } from 'node:buffer';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const directory = dirname(fileURLToPath(import.meta.url));

// A small, public-domain-style baseline JPEG used only as deterministic test data.
// The EXIF APP1 segment below is generated locally and contains no user metadata.
const baselineJpeg = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/AV//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/AV//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Aqf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z',
  'base64',
);

function exifOrientationSegment(orientation) {
  const tiff = Buffer.alloc(26);
  tiff.write('II', 0, 'ascii');
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(1, 8);
  tiff.writeUInt16LE(0x0112, 10);
  tiff.writeUInt16LE(3, 12);
  tiff.writeUInt32LE(1, 14);
  tiff.writeUInt16LE(orientation, 18);
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'ascii'), tiff]);
  const segment = Buffer.alloc(4 + payload.length);
  segment.writeUInt16BE(0xffe1, 0);
  segment.writeUInt16BE(payload.length + 2, 2);
  payload.copy(segment, 4);
  return segment;
}

function jpegWithOrientation(orientation) {
  const segment = exifOrientationSegment(orientation);
  return Buffer.concat([baselineJpeg.subarray(0, 2), segment, baselineJpeg.subarray(2)]);
}

function crc32(input) {
  let crc = 0xffffffff;
  for (const byte of input) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  name.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length);
  return chunk;
}

function samplePng() {
  const width = 4;
  const height = 3;
  const pixels = [
    [0x1d, 0x4e, 0xd8, 0xff],
    [0x60, 0xa5, 0xfa, 0xff],
    [0xf8, 0xfa, 0xfc, 0xff],
    [0xf5, 0x9e, 0x0b, 0xff],
  ];
  const rows = [];
  for (let row = 0; row < height; row += 1) {
    rows.push(0);
    for (let column = 0; column < width; column += 1) {
      rows.push(...pixels[(row + column) % pixels.length]);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(Buffer.from(rows), { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

async function writeDeterministic(name, contents) {
  const target = join(directory, name);
  let existing;
  try {
    existing = await readFile(target);
  } catch {
    // The fixture has not been generated yet.
  }
  if (!existing || !existing.equals(contents)) {
    await writeFile(target, contents);
  }
}

await mkdir(directory, { recursive: true });
for (let orientation = 1; orientation <= 8; orientation += 1) {
  await writeDeterministic(`orientation-${orientation}.jpg`, jpegWithOrientation(orientation));
}
await writeDeterministic('sample.png', samplePng());
