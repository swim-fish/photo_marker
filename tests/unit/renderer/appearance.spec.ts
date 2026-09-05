import { describe, expect, it, vi } from 'vitest';
import { createRenderPlan, renderCanvasBlob } from '../../../src/renderer/canvasRenderer';
import { defaultTemplate } from '../../../src/domain/templates/types';
import { createOverlay } from '../../../src/domain/overlays/overlayEditor';
describe('background appearance compositing', () => {
  it('paints rounded RGBA backgrounds without changing foreground alpha', async () => {
    const events: { color: string; alpha: number }[] = [];
    const context = {
      fillStyle: '',
      globalAlpha: 1,
      drawImage: vi.fn(),
      setTransform: vi.fn(),
      resetTransform: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      fillRect: vi.fn(),
      fill: vi.fn(),
      font: '',
      textBaseline: '',
      fillText: () => events.push({ color: context.fillStyle, alpha: context.globalAlpha }),
    };
    const bitmap = { width: 100, height: 100, close: vi.fn() };
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => bitmap),
    );
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        getContext() {
          return context;
        }
        convertToBlob() {
          return Promise.resolve(new Blob(['png'], { type: 'image/png' }));
        }
      },
    );
    const overlay = createOverlay({
      id: 't',
      photoId: 'p',
      role: 'freeform',
      content: '現勘',
      ...defaultTemplate.appearance,
      fontFamily: 'Noto Sans TC',
      x: 0.1,
      y: 0.1,
      width: 0.4,
      height: 0.2,
      order: 0,
    });
    const plan = createRenderPlan({
      rawWidth: 100,
      rawHeight: 100,
      orientation: 1,
      outputFormat: 'image/png',
      metadataMode: 'removeSupported',
      overlays: [overlay],
    });
    try {
      await renderCanvasBlob(new Blob(['source']), plan, 'image/png');
      expect(context.roundRect).toHaveBeenCalled();
      expect(events).toEqual([{ color: 'rgba(255, 255, 255, 1)', alpha: 1 }]);
      expect(bitmap.close).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
