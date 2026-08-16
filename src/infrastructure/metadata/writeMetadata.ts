import type { MetadataMode, ExportFormat } from '../../domain/export/types';
import { failure, type Result, success } from '../../domain/result';
import { readMetadata } from './readMetadata';

export type WriteMetadataRequest = Readonly<{
  sourceMime: ExportFormat;
  outputMime: ExportFormat;
  metadataMode: MetadataMode;
}>;

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function isSupportedJpegSegment(bytes: Uint8Array, marker: number, payload: number): boolean {
  const prefix = ascii(bytes, payload, Math.min(32, bytes.length - payload));
  return (
    (marker === 0xe0 && prefix.startsWith('JFIF\0')) ||
    (marker === 0xe1 &&
      (prefix.startsWith('Exif\0\0') || prefix.startsWith('http://ns.adobe.com/xap/1.0/'))) ||
    (marker === 0xed && prefix.startsWith('Photoshop 3.0'))
  );
}

function removeJpegMetadata(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const parts: Uint8Array[] = [bytes.subarray(0, 2)];
  let offset = 2;

  while (offset + 1 < bytes.length) {
    const segmentStart = offset;
    if (bytes[offset] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === 0xda) {
      parts.push(bytes.subarray(segmentStart));
      return concat(parts);
    }
    if (marker === 0xd9) {
      parts.push(bytes.subarray(segmentStart, offset));
      return concat(parts);
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(bytes.subarray(segmentStart, offset));
      continue;
    }
    if (offset + 2 > bytes.length) return null;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    const end = offset + length;
    if (length < 2 || end > bytes.length) return null;
    if (!isSupportedJpegSegment(bytes, marker, offset + 2)) {
      parts.push(bytes.subarray(segmentStart, end));
    }
    offset = end;
  }

  return null;
}

function jpegMetadataSegments(bytes: Uint8Array): Uint8Array[] | null {
  const segments: Uint8Array[] = [];
  let offset = 2;
  while (offset + 1 < bytes.length) {
    const segmentStart = offset;
    if (bytes[offset] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === 0xda || marker === 0xd9) return segments;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return null;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    const end = offset + length;
    if (length < 2 || end > bytes.length) return null;
    if (isSupportedJpegSegment(bytes, marker, offset + 2)) {
      segments.push(bytes.subarray(segmentStart, end));
    }
    offset = end;
  }
  return null;
}

const removablePngChunks = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'pHYs']);

function removePngMetadata(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length < 20) return null;
  const parts: Uint8Array[] = [bytes.subarray(0, 8)];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
    const end = offset + 12 + length;
    if (end > bytes.length) return null;
    const type = ascii(bytes, offset + 4, 4);
    if (!removablePngChunks.has(type)) parts.push(bytes.subarray(offset, end));
    offset = end;
    if (type === 'IEND') return concat(parts);
  }
  return null;
}

function pngMetadataChunks(bytes: Uint8Array): Uint8Array[] | null {
  const chunks: Uint8Array[] = [];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
    const end = offset + 12 + length;
    if (end > bytes.length) return null;
    const type = ascii(bytes, offset + 4, 4);
    if (removablePngChunks.has(type)) chunks.push(bytes.subarray(offset, end));
    offset = end;
    if (type === 'IEND') return chunks;
  }
  return null;
}

function attachPngMetadata(cleaned: Uint8Array, chunks: readonly Uint8Array[]): Uint8Array | null {
  let offset = 8;
  while (offset + 12 <= cleaned.length) {
    const length = new DataView(cleaned.buffer, cleaned.byteOffset + offset, 4).getUint32(0);
    const end = offset + 12 + length;
    if (end > cleaned.length) return null;
    const type = ascii(cleaned, offset + 4, 4);
    if (type === 'IDAT' || type === 'IEND') {
      return concat([cleaned.subarray(0, offset), ...chunks, cleaned.subarray(offset)]);
    }
    offset = end;
  }
  return null;
}

export async function writeMetadata(
  source: Blob,
  request: WriteMetadataRequest,
  rendered: Blob = source,
): Promise<Result<Blob, 'metadata-preservation-unavailable'>> {
  const parsed = await readMetadata(source);
  if (!parsed.ok || parsed.value.mime !== request.sourceMime) {
    return failure('metadata-preservation-unavailable');
  }
  if (request.metadataMode === 'preserveSupported') {
    if (request.sourceMime !== request.outputMime) {
      return failure('metadata-preservation-unavailable');
    }
    const sourceBytes = new Uint8Array(await source.arrayBuffer());
    const renderedBytes = new Uint8Array(await rendered.arrayBuffer());
    if (request.outputMime === 'image/jpeg') {
      const metadata = jpegMetadataSegments(sourceBytes);
      const cleaned = removeJpegMetadata(renderedBytes);
      if (!metadata || !cleaned) return failure('metadata-preservation-unavailable');
      const attached = concat([cleaned.subarray(0, 2), ...metadata, cleaned.subarray(2)]);
      return success(new Blob([attached.buffer as ArrayBuffer], { type: request.outputMime }));
    }
    const metadata = pngMetadataChunks(sourceBytes);
    const cleaned = removePngMetadata(renderedBytes);
    const attached = metadata && cleaned ? attachPngMetadata(cleaned, metadata) : null;
    if (!attached) return failure('metadata-preservation-unavailable');
    return success(new Blob([attached.buffer as ArrayBuffer], { type: request.outputMime }));
  }

  const bytes = new Uint8Array(await rendered.arrayBuffer());
  const removed =
    request.outputMime === 'image/jpeg' ? removeJpegMetadata(bytes) : removePngMetadata(bytes);
  if (!removed) return failure('metadata-preservation-unavailable');
  return success(new Blob([removed.buffer as ArrayBuffer], { type: request.outputMime }));
}
