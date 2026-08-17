import type { MetadataGroup, MetadataSummary, PhotoMime } from '../../domain/photos/types';

type MetadataProfile = Readonly<{
  groups: readonly MetadataGroup[];
  excludedGroups: readonly MetadataGroup[];
  malformed: boolean;
}>;

function addUnique(groups: MetadataGroup[], group: MetadataGroup): void {
  if (!groups.includes(group)) groups.push(group);
}

function readAscii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

const tiffTypeWidths: Readonly<Record<number, number>> = {
  1: 1,
  2: 1,
  3: 2,
  4: 4,
  5: 8,
  6: 1,
  7: 1,
  8: 2,
  9: 4,
  10: 8,
  11: 4,
  12: 8,
};

function validTiffPayload(bytes: Uint8Array, start: number, length: number): boolean {
  if (length < 8 || start < 0 || start + length > bytes.length) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset + start, length);
  const byteOrder = readAscii(bytes, start, 2);
  if (byteOrder !== 'II' && byteOrder !== 'MM') return false;
  const littleEndian = byteOrder === 'II';
  if (view.getUint16(2, littleEndian) !== 42) return false;

  const pending = [view.getUint32(4, littleEndian)];
  const visited = new Set<number>();
  while (pending.length > 0) {
    const directoryOffset = pending.pop() ?? 0;
    if (directoryOffset === 0 || visited.has(directoryOffset)) continue;
    if (visited.size >= 64 || directoryOffset > length - 2) return false;
    visited.add(directoryOffset);
    const entryCount = view.getUint16(directoryOffset, littleEndian);
    if (entryCount > 1024) return false;
    const directoryEnd = directoryOffset + 2 + entryCount * 12;
    if (!Number.isSafeInteger(directoryEnd) || directoryEnd > length - 4) return false;

    for (let index = 0; index < entryCount; index += 1) {
      const entryOffset = directoryOffset + 2 + index * 12;
      const tag = view.getUint16(entryOffset, littleEndian);
      const type = view.getUint16(entryOffset + 2, littleEndian);
      const count = view.getUint32(entryOffset + 4, littleEndian);
      const typeWidth = tiffTypeWidths[type];
      const valueBytes = typeWidth * count;
      if (!typeWidth || !Number.isSafeInteger(valueBytes)) return false;
      const valueOffset = view.getUint32(entryOffset + 8, littleEndian);
      if (valueBytes > 4 && (valueOffset > length || valueBytes > length - valueOffset)) {
        return false;
      }
      if ((tag === 0x8769 || tag === 0x8825 || tag === 0xa005) && type === 4 && count === 1) {
        pending.push(valueOffset);
      }
    }
    pending.push(view.getUint32(directoryEnd, littleEndian));
  }
  return true;
}

function inspectJpeg(bytes: Uint8Array): MetadataProfile {
  const groups: MetadataGroup[] = [];
  const excludedGroups: MetadataGroup[] = [];
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
    if (offset + 2 > bytes.length) return { groups, excludedGroups, malformed: true };
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) {
      return { groups, excludedGroups, malformed: true };
    }
    const payload = offset + 2;
    const payloadLength = length - 2;
    const prefix = readAscii(bytes, payload, Math.min(payloadLength, 32));

    if (marker === 0xe0 && prefix.startsWith('JFIF\0')) addUnique(groups, 'JFIF');
    if (marker === 0xe1 && prefix.startsWith('Exif\0\0')) {
      if (!validTiffPayload(bytes, payload + 6, payloadLength - 6)) {
        return { groups, excludedGroups, malformed: true };
      }
      addUnique(groups, 'EXIF');
    }
    if (marker === 0xe1 && prefix.startsWith('http://ns.adobe.com/xap/1.0/')) {
      addUnique(groups, 'XMP');
    }
    if (marker === 0xed && prefix.startsWith('Photoshop 3.0')) addUnique(groups, 'IPTC');
    if (marker === 0xe2 && prefix.startsWith('ICC_PROFILE')) addUnique(excludedGroups, 'ICC');
    if (marker === 0xe2 && prefix.startsWith('MPF\0')) addUnique(excludedGroups, 'MPF');

    offset += length;
  }

  return { groups, excludedGroups, malformed: false };
}

function inspectPng(bytes: Uint8Array): MetadataProfile {
  const groups: MetadataGroup[] = [];
  const excludedGroups: MetadataGroup[] = [];
  let offset = 8;
  let sawEnd = false;

  while (offset + 12 <= bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 4);
    const length = view.getUint32(0);
    const end = offset + 12 + length;
    if (end > bytes.length) return { groups, excludedGroups, malformed: true };
    const type = readAscii(bytes, offset + 4, 4);
    if (type === 'eXIf') {
      if (!validTiffPayload(bytes, offset + 8, length)) {
        return { groups, excludedGroups, malformed: true };
      }
      addUnique(groups, 'eXIf');
    }
    if (type === 'tEXt' || type === 'zTXt' || type === 'iTXt') addUnique(groups, 'text');
    if (type === 'pHYs') addUnique(groups, 'pHYs');
    if (type === 'iCCP') addUnique(excludedGroups, 'ICC');
    offset = end;
    if (type === 'IEND') {
      sawEnd = true;
      break;
    }
  }

  return { groups, excludedGroups, malformed: !sawEnd };
}

export function inspectMetadataProfile(bytes: Uint8Array, mime: PhotoMime): MetadataProfile {
  return mime === 'image/jpeg' ? inspectJpeg(bytes) : inspectPng(bytes);
}

export function createMetadataSummary(
  profile: MetadataProfile,
  captureGps: MetadataSummary['captureGps'],
  orientationPresent: boolean,
): MetadataSummary {
  return {
    captureGps,
    orientationPresent,
    groups: profile.groups,
    preservationEligibility:
      profile.groups.length === 0 ? 'none' : profile.malformed ? 'malformed' : 'supported',
    excludedGroups: profile.excludedGroups,
  };
}
