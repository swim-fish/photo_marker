import { describe, expect, it, vi } from 'vitest';
import { createRenderPlan, renderCanvasBlob } from '../../../src/renderer/canvasRenderer';
import { defaultWatermark } from '../../../src/domain/watermarks/types';
import { arrangeWatermark } from '../../../src/domain/watermarks/layout';
import { createOverlay } from '../../../src/domain/overlays/overlayEditor';
import { defaultTemplate } from '../../../src/domain/templates/types';
describe('watermark compositing layer', () => {
  it('paints stored text positions before foreground and restores opacity', async () => {
    const events: { text: string; alpha: number }[] = [],
      stack: number[] = [];
    const context = {
      globalAlpha: 1,
      fillStyle: '',
      font: '',
      textBaseline: '',
      drawImage: vi.fn(),
      setTransform: vi.fn(),
      resetTransform: vi.fn(),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      fillRect: vi.fn(),
      fill: vi.fn(),
      save: () => {
        stack.push(context.globalAlpha);
      },
      restore: () => {
        context.globalAlpha = stack.pop()!;
      },
      fillText: (text: string) => {
        events.push({ text, alpha: context.globalAlpha });
      },
      measureText: () => ({ width: 20 }),
    };
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 400, height: 300, close: vi.fn() })),
    );
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        getContext() {
          return context;
        }
        convertToBlob() {
          return Promise.resolve(new Blob(['p'], { type: 'image/png' }));
        }
      },
    );
    const config = { ...defaultWatermark, enabled: true, text: 'MARK', opacity: 0.25 };
    const overlay = createOverlay({
      id: 't',
      photoId: 'p',
      role: 'freeform',
      content: 'LABEL',
      ...defaultTemplate.appearance,
      fontFamily: 'Noto Sans TC',
      x: 0.1,
      y: 0.1,
      width: 0.4,
      height: 0.2,
      order: 0,
    });
    try {
      await renderCanvasBlob(
        new Blob(['s']),
        createRenderPlan({
          rawWidth: 400,
          rawHeight: 300,
          orientation: 6,
          outputFormat: 'image/png',
          metadataMode: 'removeSupported',
          overlays: [overlay],
          watermark: { config, arrangement: arrangeWatermark('p', 0.75, config)!, assets: [] },
        }),
        'image/png',
      );
      expect(events).toEqual([
        { text: 'MARK', alpha: 0.25 },
        { text: 'LABEL', alpha: 1 },
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('uses the browser-decoded display bitmap once, then maps it back only for preserve-raw output', async () => {
    const drawImage = vi.fn();
    const setTransform = vi.fn();
    const dimensions: Array<readonly [number, number]> = [];
    const context = {
      drawImage,
      setTransform,
      save: vi.fn(),
      restore: vi.fn(),
      globalAlpha: 1,
    };
    const bitmap = { width: 100, height: 160, close: vi.fn() };
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => bitmap),
    );
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        constructor(width: number, height: number) {
          dimensions.push([width, height]);
        }
        getContext() {
          return context;
        }
        convertToBlob() {
          return Promise.resolve(new Blob(['p'], { type: 'image/png' }));
        }
      },
    );
    try {
      const baked = createRenderPlan({
        rawWidth: 160,
        rawHeight: 100,
        orientation: 6,
        outputFormat: 'image/png',
        metadataMode: 'removeSupported',
        overlays: [],
      });
      await renderCanvasBlob(new Blob(['source']), baked, 'image/png');
      expect(dimensions[0]).toEqual([100, 160]);
      expect(drawImage).toHaveBeenLastCalledWith(bitmap, 0, 0, 100, 160);
      expect(setTransform).not.toHaveBeenCalled();

      const preserved = createRenderPlan({
        rawWidth: 160,
        rawHeight: 100,
        orientation: 6,
        sourceFormat: 'image/jpeg',
        outputFormat: 'image/jpeg',
        metadataMode: 'preserveSupported',
        overlays: [],
      });
      await renderCanvasBlob(new Blob(['source']), preserved, 'image/jpeg');
      expect(dimensions[1]).toEqual([160, 100]);
      expect(setTransform).toHaveBeenCalledOnce();
      expect(drawImage).toHaveBeenLastCalledWith(bitmap, 0, 0, 100, 160);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
