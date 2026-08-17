import type { TextOverlay } from '../overlays/types';
import type { SourcePhoto } from '../photos/types';
import { failure, type Result, type Success, success } from '../result';
import { writeMetadata } from '../../infrastructure/metadata/writeMetadata';
import { hashBlob } from '../../infrastructure/platform/hashBlob';
import {
  saveOutput as platformSaveOutput,
  SaveCancelledError,
} from '../../infrastructure/platform/saveOutput';
import {
  renderPhoto as defaultRenderPhoto,
  type RenderPhotoOptions,
  type RenderPhotoValue,
} from '../../renderer/renderPhoto';
import type { ExportFallback, ExportFormat, ExportResult, MetadataMode, SaveMethod } from './types';

export type ExportPhotoRequest = Readonly<{
  photoId: string;
  format: ExportFormat;
  metadataMode: MetadataMode;
  quality?: number | null;
  outputName: string;
  saveMethod: SaveMethod;
  fallback: ExportFallback | null;
  overlays?: readonly TextOverlay[];
}>;

type RenderDependency = (
  source: Blob,
  options: RenderPhotoOptions,
) => Promise<Result<RenderPhotoValue, 'decode-failed' | 'encode-failed'>>;

export type ExportPhotoDependencies = Readonly<{
  renderPhoto?: RenderDependency;
  saveOutput?: (blob: Blob, outputName: string, method: SaveMethod) => Promise<SaveMethod | void>;
  existingOutputNames?: readonly string[];
  signal?: AbortSignal;
}>;

function extension(format: ExportFormat): string {
  return format === 'image/png' ? '.png' : '.jpg';
}

function splitName(name: string): readonly [string, string] {
  const index = name.lastIndexOf('.');
  return index > 0 ? [name.slice(0, index), name.slice(index)] : [name, ''];
}

export function conflictSafeOutputName(
  requestedName: string,
  format: ExportFormat,
  existingNames: readonly string[] = [],
): string {
  const expectedExtension = extension(format);
  const [rawStem] = splitName(requestedName.trim() || 'annotated-photo');
  const stem =
    [...rawStem]
      .map((character) =>
        character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character) ? '-' : character,
      )
      .join('')
      .trim() || 'annotated-photo';
  const outputExtension = expectedExtension;
  const taken = new Set(existingNames.map((name) => name.toLocaleLowerCase()));
  let candidate = `${stem}${outputExtension}`;
  if (!taken.has(candidate.toLocaleLowerCase())) return candidate;
  let suffix = 1;
  do {
    candidate = `${stem}-annotated${suffix === 1 ? '' : `-${suffix}`}${outputExtension}`;
    suffix += 1;
  } while (taken.has(candidate.toLocaleLowerCase()));
  return candidate;
}

function hasExpectedSignature(blob: Blob, format: ExportFormat): Promise<boolean> {
  return blob
    .slice(0, 8)
    .arrayBuffer()
    .then((buffer) => {
      const bytes = new Uint8Array(buffer);
      return format === 'image/jpeg'
        ? bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
        : [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
            (byte, index) => bytes[index] === byte,
          );
    });
}

function resultBase(
  photoId: string,
  startedAt: string,
): Pick<ExportResult, 'photoId' | 'startedAt'> {
  return { photoId, startedAt };
}

export async function exportPhoto(
  source: SourcePhoto,
  request: ExportPhotoRequest,
  dependencies: ExportPhotoDependencies = {},
): Promise<
  Result<ExportResult, 'invalid-input' | 'metadata-preservation-unavailable' | 'encode-failed'>
> {
  if (source.id !== request.photoId) return failure('invalid-input');
  if (request.metadataMode === 'preserveSupported' && request.format !== source.sourceMime) {
    return failure('metadata-preservation-unavailable');
  }

  const startedAt = new Date().toISOString();
  const cancelled = (): Success<ExportResult> =>
    success({
      ...resultBase(source.id, startedAt),
      status: 'cancelled',
      outputName: null,
      outputMime: null,
      outputBytes: null,
      saveMethod: null,
      failureCode: 'save-cancelled',
      finishedAt: new Date().toISOString(),
      phaseDurationsMs: {},
    });
  if (dependencies.signal?.aborted) return cancelled();

  const beforeDigest = await hashBlob(source.sourceBlob);
  const renderStarted = performance.now();
  const rendered = await (dependencies.renderPhoto ?? defaultRenderPhoto)(source.sourceBlob, {
    mode: 'export',
    orientation: source.orientation,
    overlays: request.overlays ?? [],
    outputFormat: request.format,
    metadataMode: request.metadataMode,
    quality: request.format === 'image/jpeg' ? (request.quality ?? 0.92) : undefined,
  });
  const renderDuration = performance.now() - renderStarted;
  if (!rendered.ok) {
    return success({
      ...resultBase(source.id, startedAt),
      status: 'failed',
      outputName: null,
      outputMime: null,
      outputBytes: null,
      saveMethod: null,
      failureCode: rendered.error.code,
      finishedAt: new Date().toISOString(),
      phaseDurationsMs: { render: renderDuration },
    });
  }
  if (
    rendered.value.mime !== request.format ||
    rendered.value.blob.type !== request.format ||
    !(await hasExpectedSignature(rendered.value.blob, request.format))
  ) {
    return success({
      ...resultBase(source.id, startedAt),
      status: 'failed',
      outputName: null,
      outputMime: null,
      outputBytes: null,
      saveMethod: null,
      failureCode: 'encode-failed',
      finishedAt: new Date().toISOString(),
      phaseDurationsMs: { render: renderDuration },
    });
  }

  const metadataStarted = performance.now();
  const metadata = await writeMetadata(
    source.sourceBlob,
    {
      sourceMime: source.sourceMime,
      outputMime: request.format,
      metadataMode: request.metadataMode,
    },
    rendered.value.blob,
  );
  if (!metadata.ok) return failure(metadata.error.code);
  const metadataDuration = performance.now() - metadataStarted;
  if (dependencies.signal?.aborted) return cancelled();

  const outputName = conflictSafeOutputName(
    request.outputName === source.sourceName
      ? `${splitName(source.sourceName)[0]}-annotated`
      : request.outputName,
    request.format,
    [source.sourceName, ...(dependencies.existingOutputNames ?? [])],
  );
  const handoffStarted = performance.now();
  try {
    const actualMethod = await (dependencies.saveOutput ?? platformSaveOutput)(
      metadata.value,
      outputName,
      request.saveMethod,
    );
    if ((await hashBlob(source.sourceBlob)) !== beforeDigest) return failure('invalid-input');
    return success({
      ...resultBase(source.id, startedAt),
      status: 'handedOff',
      outputName,
      outputMime: request.format,
      outputBytes: metadata.value.size,
      saveMethod: actualMethod ?? request.saveMethod,
      failureCode: null,
      finishedAt: new Date().toISOString(),
      phaseDurationsMs: {
        render: renderDuration,
        metadataAttachment: metadataDuration,
        handoff: performance.now() - handoffStarted,
      },
    });
  } catch (error) {
    if (error instanceof SaveCancelledError || dependencies.signal?.aborted) return cancelled();
    return success({
      ...resultBase(source.id, startedAt),
      status: 'failed',
      outputName,
      outputMime: request.format,
      outputBytes: metadata.value.size,
      saveMethod: null,
      failureCode: 'save-failed',
      finishedAt: new Date().toISOString(),
      phaseDurationsMs: {
        render: renderDuration,
        metadataAttachment: metadataDuration,
        handoff: performance.now() - handoffStarted,
      },
    });
  }
}
