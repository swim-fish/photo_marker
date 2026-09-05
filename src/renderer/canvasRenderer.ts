import { ensureEditorFont } from './font';
import type { WatermarkRenderLayer } from '../domain/watermarks/types';
import type { TextOverlay } from '../domain/overlays/types';
import { sortOverlaysByOrder } from '../domain/overlays/geometry';
import type { PhotoOrientation } from '../domain/photos/types';
import {
  displayDimensions,
  displayPointToRawPoint,
  layoutOverlayRect,
  mapDisplayRectToRaw,
  type PixelRect,
} from './layout';

export type RenderPlanInput = Readonly<{
  rawWidth: number;
  rawHeight: number;
  orientation: PhotoOrientation;
  sourceFormat?: 'image/jpeg' | 'image/png';
  outputFormat: 'image/jpeg' | 'image/png';
  metadataMode: 'preserveSupported' | 'removeSupported';
  overlays: readonly TextOverlay[];
  watermark?: WatermarkRenderLayer;
}>;

export type RenderPlan = Readonly<{
  displayWidth: number;
  displayHeight: number;
  outputWidth: number;
  outputHeight: number;
  sourceOrientation: PhotoOrientation;
  orientation: PhotoOrientation;
  orientationMode: 'preserveRaw' | 'bakeUpright';
  disclosureRequired: boolean;
  overlays: readonly TextOverlay[];
  watermark?: WatermarkRenderLayer;
  overlayRects: readonly PixelRect[];
  rawOverlayRects: readonly PixelRect[];
}>;

export function createRenderPlan(input: RenderPlanInput): RenderPlan {
  const display = displayDimensions(input.rawWidth, input.rawHeight, input.orientation);
  const overlays = sortOverlaysByOrder(input.overlays);
  const preserveRaw =
    input.metadataMode === 'preserveSupported' &&
    input.outputFormat === (input.sourceFormat ?? 'image/jpeg');

  return {
    displayWidth: display.width,
    displayHeight: display.height,
    outputWidth: preserveRaw ? input.rawWidth : display.width,
    outputHeight: preserveRaw ? input.rawHeight : display.height,
    sourceOrientation: input.orientation,
    orientation: preserveRaw ? input.orientation : 1,
    orientationMode: preserveRaw ? 'preserveRaw' : 'bakeUpright',
    disclosureRequired: !preserveRaw,
    overlays,
    watermark: input.watermark,
    overlayRects: overlays.map((overlay) => layoutOverlayRect(overlay, display)),
    rawOverlayRects: overlays.map((overlay) =>
      mapDisplayRectToRaw(overlay, input.rawWidth, input.rawHeight, input.orientation),
    ),
  };
}

export function createPreviewPlan(plan: RenderPlan): RenderPlan {
  const scale = Math.min(1, 1280 / Math.max(plan.displayWidth, plan.displayHeight));
  const width = Math.round(plan.displayWidth * scale),
    height = Math.round(plan.displayHeight * scale);
  return {
    ...plan,
    displayWidth: width,
    displayHeight: height,
    outputWidth: width,
    outputHeight: height,
    orientationMode: 'bakeUpright',
  };
}

type CanvasContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type CanvasSurface = HTMLCanvasElement | OffscreenCanvas;

function affineFromNormalized(
  map: (point: Readonly<{ x: number; y: number }>) => Readonly<{ x: number; y: number }>,
  inputWidth: number,
  inputHeight: number,
  outputWidth: number,
  outputHeight: number,
): readonly [number, number, number, number, number, number] {
  const origin = map({ x: 0, y: 0 });
  const horizontal = map({ x: 1, y: 0 });
  const vertical = map({ x: 0, y: 1 });
  return [
    ((horizontal.x - origin.x) * outputWidth) / inputWidth,
    ((horizontal.y - origin.y) * outputHeight) / inputWidth,
    ((vertical.x - origin.x) * outputWidth) / inputHeight,
    ((vertical.y - origin.y) * outputHeight) / inputHeight,
    origin.x * outputWidth,
    origin.y * outputHeight,
  ];
}

function rgba(color: TextOverlay['textColor']): string {
  if (typeof color === 'string') return color;
  return `rgba(${color.red}, ${color.green}, ${color.blue}, ${color.alpha})`;
}

function paintOverlays(
  context: CanvasContext,
  overlays: readonly TextOverlay[],
  dimensions: Readonly<{ width: number; height: number }>,
): void {
  for (const overlay of overlays) {
    const rectangle = layoutOverlayRect(overlay, dimensions);
    const padding = Math.max(0, overlay.padding) * Math.min(dimensions.width, dimensions.height);
    const fontSize = Math.max(1, overlay.fontSize * dimensions.height);
    context.save();
    context.fillStyle = rgba(overlay.backgroundColor);
    const radius = Math.min(
      rectangle.width / 2,
      rectangle.height / 2,
      Math.max(0, overlay.cornerRadius ?? 0) * Math.min(dimensions.width, dimensions.height),
    );
    if (radius > 0) {
      context.beginPath();
      if (typeof context.roundRect === 'function')
        context.roundRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height, radius);
      else {
        const { x, y, width: w, height: h } = rectangle,
          r = radius;
        context.moveTo(x + r, y);
        context.lineTo(x + w - r, y);
        context.quadraticCurveTo(x + w, y, x + w, y + r);
        context.lineTo(x + w, y + h - r);
        context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        context.lineTo(x + r, y + h);
        context.quadraticCurveTo(x, y + h, x, y + h - r);
        context.lineTo(x, y + r);
        context.quadraticCurveTo(x, y, x + r, y);
        context.closePath();
      }
      context.fill();
    } else context.fillRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
    context.beginPath();
    context.rect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
    context.clip();
    context.fillStyle = rgba(overlay.textColor);
    context.font = `${fontSize}px "${overlay.fontFamily}", sans-serif`;
    context.textBaseline = 'top';
    for (const [index, line] of overlay.content.split(/\r?\n/).entries()) {
      context.fillText(
        line,
        rectangle.x + padding,
        rectangle.y + padding + index * fontSize * Math.max(0, overlay.lineHeight),
      );
    }
    context.restore();
  }
}

async function paintWatermark(context: CanvasContext, plan: RenderPlan): Promise<void> {
  const layer = plan.watermark;
  if (!layer?.config.enabled || (layer.config.kind === 'text' && !layer.config.text.trim())) return;
  if (
    !Number.isFinite(layer.config.opacity) ||
    layer.config.opacity < 0 ||
    layer.config.opacity > 1 ||
    layer.arrangement.rectangles.length > 20
  )
    throw new Error('Invalid watermark.');
  const count =
    layer.config.mode === 'single'
      ? 1
      : ({ low: 5, medium: 10, high: 20 } as const)[layer.config.density];
  if (layer.arrangement.algorithmVersion !== 1 || layer.arrangement.rectangles.length !== count)
    throw new Error('Invalid watermark arrangement.');
  let image: ImageBitmap | undefined;
  if (layer.config.kind === 'image') {
    const asset = layer.assets.find((value) => value.id === layer.config.assetId);
    if (!asset || layer.config.mode !== 'single') throw new Error('Invalid watermark asset.');
    image = await createImageBitmap(asset.blob, { imageOrientation: 'none' });
  }
  context.save();
  try {
    context.globalAlpha = layer.config.opacity;
    for (const rectangle of layer.arrangement.rectangles) {
      if (
        ![rectangle.x, rectangle.y, rectangle.width, rectangle.height].every(Number.isFinite) ||
        rectangle.x < 0 ||
        rectangle.y < 0 ||
        rectangle.width <= 0 ||
        rectangle.height <= 0 ||
        rectangle.x + rectangle.width > 1 ||
        rectangle.y + rectangle.height > 1
      )
        throw new Error('Invalid watermark layout.');
      const x = rectangle.x * plan.displayWidth,
        y = rectangle.y * plan.displayHeight,
        width = rectangle.width * plan.displayWidth,
        height = rectangle.height * plan.displayHeight;
      if (image) context.drawImage(image, x, y, width, height);
      else {
        const fontSize = 0.025 * plan.displayHeight;
        context.font = `${fontSize}px "Noto Sans TC", sans-serif`;
        context.fillStyle = '#ffffff';
        context.textBaseline = 'top';
        context.fillText(layer.config.text, x, y + Math.max(0, (height - fontSize) / 2), width);
      }
    }
  } finally {
    context.restore();
    image?.close();
  }
}

function canvasToBlob(
  canvas: CanvasSurface,
  mime: 'image/jpeg' | 'image/png',
  quality: number | undefined,
): Promise<Blob | null> {
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type: mime, quality }).catch(() => null);
  }
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
}

function createCanvas(width: number, height: number): CanvasSurface | null {
  if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(width, height);
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
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
  const chunk = new Uint8Array(data.length + 12);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  view.setUint32(data.length + 8, crc32(chunk.subarray(4, data.length + 8)));
  return chunk;
}

function storedDeflate(data: Uint8Array): Uint8Array {
  const blocks = Math.ceil(data.length / 65_535);
  const output = new Uint8Array(2 + data.length + blocks * 5 + 4);
  output.set([0x78, 0x01]);
  let sourceOffset = 0;
  let outputOffset = 2;
  for (let block = 0; block < blocks; block += 1) {
    const length = Math.min(65_535, data.length - sourceOffset);
    output[outputOffset++] = block === blocks - 1 ? 1 : 0;
    output[outputOffset++] = length & 0xff;
    output[outputOffset++] = length >>> 8;
    const complement = ~length & 0xffff;
    output[outputOffset++] = complement & 0xff;
    output[outputOffset++] = complement >>> 8;
    output.set(data.subarray(sourceOffset, sourceOffset + length), outputOffset);
    sourceOffset += length;
    outputOffset += length;
  }
  let a = 1;
  let b = 0;
  for (const byte of data) {
    a = (a + byte) % 65_521;
    b = (b + a) % 65_521;
  }
  new DataView(output.buffer).setUint32(output.length - 4, ((b << 16) | a) >>> 0);
  return output;
}

export function createBlankPng(width: number, height: number): Blob | null {
  const byteLength = height * (1 + width * 4);
  if (!Number.isSafeInteger(byteLength) || byteLength < 1 || byteLength > 4 * 1024 * 1024) {
    return null;
  }
  const pixels = new Uint8Array(byteLength);
  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, width);
  headerView.setUint32(4, height);
  header.set([8, 6, 0, 0, 0], 8);
  const bytes = new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...pngChunk('IHDR', header),
    ...pngChunk('IDAT', storedDeflate(pixels)),
    ...pngChunk('IEND', new Uint8Array()),
  ]);
  return new Blob([bytes.buffer], { type: 'image/png' });
}

export async function renderCanvasBlob(
  source: Blob,
  plan: RenderPlan,
  mime: 'image/jpeg' | 'image/png',
  quality?: number,
): Promise<Blob | null> {
  if (typeof createImageBitmap !== 'function') return null;
  if (plan.overlays.length || plan.watermark?.config.enabled) await ensureEditorFont();
  // Chromium applies JPEG EXIF orientation while decoding a Blob even when callers request
  // `imageOrientation: 'none'`. Treat this bitmap as display-oriented in every path so a
  // portrait JPEG is never rotated a second time. The preserve-raw path below explicitly maps
  // that display raster back to raw pixels before its EXIF orientation is retained.
  const bitmap = await createImageBitmap(source);
  try {
    const preserveRaw = plan.orientationMode === 'preserveRaw';
    const canvas = createCanvas(
      preserveRaw ? plan.outputWidth : plan.displayWidth,
      preserveRaw ? plan.outputHeight : plan.displayHeight,
    );
    if (!canvas) return null;
    const context = canvas.getContext('2d') as CanvasContext | null;
    if (!context) return null;

    if (preserveRaw) {
      const transform = affineFromNormalized(
        (point) => displayPointToRawPoint(point, plan.sourceOrientation),
        plan.displayWidth,
        plan.displayHeight,
        plan.outputWidth,
        plan.outputHeight,
      );
      context.setTransform(...transform);
      context.drawImage(bitmap, 0, 0, plan.displayWidth, plan.displayHeight);
      await paintWatermark(context, plan);
      paintOverlays(context, plan.overlays, {
        width: plan.displayWidth,
        height: plan.displayHeight,
      });
    } else {
      context.drawImage(bitmap, 0, 0, plan.displayWidth, plan.displayHeight);
      await paintWatermark(context, plan);
      paintOverlays(context, plan.overlays, {
        width: plan.displayWidth,
        height: plan.displayHeight,
      });
    }

    return canvasToBlob(canvas, mime, quality);
  } finally {
    bitmap.close();
  }
}
