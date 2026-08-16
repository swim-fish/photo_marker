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
    if (marker === 0xe1 && prefix.startsWith('Exif\0\0')) addUnique(groups, 'EXIF');
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
    if (type === 'eXIf') addUnique(groups, 'eXIf');
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
