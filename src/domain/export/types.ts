export type ExportFormat = 'image/jpeg' | 'image/png';
export type MetadataMode = 'preserveSupported' | 'removeSupported';
export type OrientationMode = 'preserveRaw' | 'bakeUpright';
export type SaveMethod = 'filePicker' | 'download' | 'webShare';

export type ExportFallback = Readonly<{
  code: string;
  message: string;
  acknowledged: boolean;
}>;

export type ExportConfiguration = Readonly<{
  photoId: string;
  format: ExportFormat;
  width: number;
  height: number;
  quality: number | null;
  metadataMode: MetadataMode;
  orientationMode: OrientationMode;
  fallback: ExportFallback | null;
  outputName: string;
  saveMethod: SaveMethod;
}>;

export type ExportResultStatus =
  'pending' | 'rendering' | 'handedOff' | 'omitted' | 'cancelled' | 'failed';

export type ExportResult = Readonly<{
  photoId: string;
  status: ExportResultStatus;
  outputName: string | null;
  outputMime: ExportFormat | null;
  outputBytes: number | null;
  saveMethod: SaveMethod | null;
  failureCode: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  phaseDurationsMs: Readonly<{
    decode?: number;
    render?: number;
    encode?: number;
    metadataAttachment?: number;
    handoff?: number;
  }>;
}>;

export function isExportConfigurationReady(
  configuration: ExportConfiguration | null,
  sourceMime: ExportFormat,
): boolean {
  if (!configuration) return false;
  const validDimensions =
    Number.isSafeInteger(configuration.width) &&
    Number.isSafeInteger(configuration.height) &&
    configuration.width >= 1 &&
    configuration.height >= 1 &&
    configuration.width <= 8192 &&
    configuration.height <= 8192 &&
    configuration.width * configuration.height <= 13_000_000;
  const validQuality =
    configuration.format === 'image/png' ||
    (typeof configuration.quality === 'number' &&
      configuration.quality >= 0.1 &&
      configuration.quality <= 1);
  const validMetadata = !(
    configuration.metadataMode === 'preserveSupported' && configuration.format !== sourceMime
  );
  return (
    validDimensions &&
    validQuality &&
    validMetadata &&
    configuration.outputName.trim().length > 0 &&
    !configuration.fallback
  );
}
