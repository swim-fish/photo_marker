import type { TextOverlay } from '../domain/overlays/types';
import type { PhotoMime, PhotoOrientation } from '../domain/photos/types';
import { failure, type Result, success } from '../domain/result';
import { readMetadata } from '../infrastructure/metadata/readMetadata';
import { createRenderPlan, renderCanvasBlob, type RenderPlan } from './canvasRenderer';

export { createRenderPlan } from './canvasRenderer';

export type RenderResources = Readonly<{
  releaseBitmap?: () => void;
  revokeObjectUrl?: () => void;
}>;

export type RenderPhotoOptions = Readonly<{
  mode: 'preview' | 'export';
  orientation?: PhotoOrientation;
  overlays: readonly TextOverlay[];
  outputFormat?: PhotoMime;
  metadataMode?: 'preserveSupported' | 'removeSupported';
  workerAvailable?: boolean;
  quality?: number;
  renderCanvas?: typeof renderCanvasBlob;
  resources?: RenderResources;
}>;

export type RenderPhotoValue = Readonly<{
  blob: Blob;
  mime: PhotoMime;
  renderPath: 'worker' | 'main-thread';
  overlayRects: RenderPlan['overlayRects'];
  plan: RenderPlan;
}>;

export async function renderPhoto(
  source: Blob,
  options: RenderPhotoOptions,
): Promise<Result<RenderPhotoValue, 'decode-failed' | 'encode-failed'>> {
  try {
    const metadata = await readMetadata(source);
    if (!metadata.ok) return failure('decode-failed');
    const sourceFormat = metadata.value.mime;
    const outputFormat = options.outputFormat ?? sourceFormat;
    const plan = createRenderPlan({
      rawWidth: metadata.value.rawWidth,
      rawHeight: metadata.value.rawHeight,
      orientation: options.orientation ?? metadata.value.orientation,
      sourceFormat,
      outputFormat,
      metadataMode: options.metadataMode ?? 'preserveSupported',
      overlays: options.overlays,
    });

    const canvasPlan: RenderPlan =
      options.mode === 'preview' && plan.orientationMode === 'preserveRaw'
        ? {
            ...plan,
            outputWidth: plan.displayWidth,
            outputHeight: plan.displayHeight,
            orientationMode: 'bakeUpright',
          }
        : plan;
    const blob = await (options.renderCanvas ?? renderCanvasBlob)(
      source,
      canvasPlan,
      outputFormat,
      options.quality,
    );
    if (!blob) return failure('encode-failed');
    if (blob.type !== outputFormat) return failure('encode-failed');

    return success({
      blob,
      mime: outputFormat,
      renderPath: options.workerAvailable === false ? 'main-thread' : 'worker',
      overlayRects: plan.overlayRects,
      plan,
    });
  } finally {
    options.resources?.releaseBitmap?.();
    options.resources?.revokeObjectUrl?.();
  }
}
