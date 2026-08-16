export type Wgs84Coordinate = Readonly<{
  latitude: number;
  longitude: number;
}>;

export type CoordinateProvenance = 'CAPTURE_METADATA' | 'CURRENT_GPS' | 'MANUAL_INPUT';

export type CoordinateInputFormat =
  'WGS84_DD' | 'WGS84_DMS' | 'TWD97_TM2' | 'TWD67_TM2' | 'MGRS' | 'TAIPOWER' | 'DEVICE_WGS84';

export type CoordinateDisplayFormat =
  'WGS84_DD' | 'WGS84_DMS' | 'TWD97_TM2' | 'TWD67_TM2' | 'MGRS' | 'TAIPOWER';

export type CoordinateZone = 119 | 121;
export type CoverageStatus = 'available' | 'outOfCoverage' | 'unsupportedPrecision';
export type CoordinateValidationStatus =
  'valid' | 'malformed' | 'outOfRange' | 'outOfCoverage' | 'ambiguous';

export type CoordinateRecord = Readonly<{
  id: string;
  photoId: string;
  latitude: number;
  longitude: number;
  provenance: CoordinateProvenance;
  inputFormat: CoordinateInputFormat;
  displayFormat: CoordinateDisplayFormat;
  zone: CoordinateZone | null;
  zoneAutoResolved: boolean;
  precision: number | null;
  accuracyMeters: number | null;
  acquiredAt: string | null;
  coverageStatus: CoverageStatus;
  validationStatus: CoordinateValidationStatus;
}>;
