import type { Wgs84Coordinate } from '../coordinates/types';

export const photoMimeTypes = ['image/jpeg', 'image/png'] as const;
export type PhotoMime = (typeof photoMimeTypes)[number];
export type PhotoOrientation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type MetadataGroup =
  | 'EXIF'
  | 'XMP'
  | 'IPTC'
  | 'JFIF'
  | 'eXIf'
  | 'text'
  | 'pHYs'
  | 'ICC'
  | 'MPF'
  | 'thumbnail'
  | 'unknown';

export type MetadataPreservationEligibility =
  'supported' | 'unsupportedForFormatChange' | 'malformed' | 'none';

export type MetadataSummary = Readonly<{
  captureGps: Wgs84Coordinate | null;
  orientationPresent: boolean;
  groups: readonly MetadataGroup[];
  preservationEligibility: MetadataPreservationEligibility;
  excludedGroups: readonly MetadataGroup[];
}>;

export type PhotoReviewStatus =
  'importing' | 'ready' | 'missingCoordinate' | 'invalid' | 'omitted' | 'exported' | 'failed';

export type SourcePhoto = Readonly<{
  id: string;
  sessionId: string;
  sourceBlob: Blob;
  sourceName: string;
  sourceMime: PhotoMime;
  sourceBytes: number;
  sourceDigest: string;
  rawWidth: number;
  rawHeight: number;
  displayWidth: number;
  displayHeight: number;
  orientation: PhotoOrientation;
  metadataSummary: MetadataSummary;
  coordinateId: string | null;
  overlayIds: readonly string[];
  reviewStatus: PhotoReviewStatus;
  failureCode: string | null;
}>;
