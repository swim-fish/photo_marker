import { describe, expect, it, vi } from 'vitest';

import { createRenderPlan, renderPhoto } from '../../../src/renderer/renderPhoto';
import { createPhotoFixtureFile, orientationFixtureNames } from '../../helpers/photoFixtures';

const overlay = {
  id: 'overlay-1',
  photoId: 'photo-1',
  role: 'freeform' as const,
  content: '台灣現場 🧭',
  fontFamily: 'Noto Sans TC',
  fontSize: 0.04,
  textColor: '#ffffff',
  backgroundColor: '#111827',
  x: 0.1,
  y: 0.2,
  width: 0.25,
  height: 0.1,
  padding: 0.01,
  lineHeight: 1.2,
  order: 0,
  contrastStatus: 'acceptable' as const,
};

describe('photo renderer planning and fallbacks', () => {
  it('fails closed when no real canvas renderer is available', async () => {
    const source = await createPhotoFixtureFile('orientation-6.jpg');
    await expect(
      renderPhoto(source, {
        mode: 'export',
        orientation: 6,
        outputFormat: 'image/png',
        metadataMode: 'removeSupported',
        overlays: [overlay],
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'encode-failed' } });
  });

  it('plans all EXIF orientations against the display-oriented image', () => {
    const plans = orientationFixtureNames.map((_, index) =>
      createRenderPlan({
        rawWidth: 400,
        rawHeight: 300,
        orientation: (index + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
        outputFormat: 'image/jpeg',
        metadataMode: 'preserveSupported',
        overlays: [overlay],
      }),
    );

    expect(plans).toHaveLength(8);
    expect(plans.slice(0, 4).every((plan) => plan.displayWidth === 400)).toBe(true);
    expect(plans.slice(4).every((plan) => plan.displayWidth === 300)).toBe(true);
    expect(plans.every((plan) => plan.overlays[0].content === '台灣現場 🧭')).toBe(true);
  });

  it('inverse-maps display overlays while preserving raw dimensions and source orientation', () => {
    const plan = createRenderPlan({
      rawWidth: 400,
      rawHeight: 300,
      orientation: 6,
      outputFormat: 'image/jpeg',
      metadataMode: 'preserveSupported',
      overlays: [overlay],
    });

    expect(plan).toMatchObject({
      outputWidth: 400,
      outputHeight: 300,
      orientation: 6,
      orientationMode: 'preserveRaw',
    });
    expect(plan.rawOverlayRects[0].width).toBeGreaterThan(0);
    expect(plan.rawOverlayRects[0].height).toBeGreaterThan(0);
  });

  it('bakes upright pixels and discloses normalization on format change or metadata removal', () => {
    const formatChange = createRenderPlan({
      rawWidth: 400,
      rawHeight: 300,
      orientation: 6,
      outputFormat: 'image/png',
      metadataMode: 'preserveSupported',
      overlays: [overlay],
    });
    const metadataRemoval = createRenderPlan({
      rawWidth: 400,
      rawHeight: 300,
      orientation: 6,
      outputFormat: 'image/jpeg',
      metadataMode: 'removeSupported',
      overlays: [overlay],
    });

    for (const plan of [formatChange, metadataRemoval]) {
      expect(plan).toMatchObject({
        outputWidth: 300,
        outputHeight: 400,
        orientation: 1,
        orientationMode: 'bakeUpright',
        disclosureRequired: true,
      });
    }
  });

  it('keeps preview and export geometry equivalent and releases resources on worker fallback', async () => {
    const source = await createPhotoFixtureFile('orientation-6.jpg');
    const releaseBitmap = vi.fn();
    const revokeObjectUrl = vi.fn();
    const preview = await renderPhoto(source, {
      mode: 'preview',
      orientation: 6,
      overlays: [overlay],
      renderCanvas: async (blob) => blob.slice(0, blob.size, 'image/jpeg'),
    });
    const exported = await renderPhoto(source, {
      mode: 'export',
      orientation: 6,
      overlays: [overlay],
      workerAvailable: false,
      renderCanvas: async (blob) => blob.slice(0, blob.size, 'image/jpeg'),
      resources: { releaseBitmap, revokeObjectUrl },
    });

    expect(preview.ok).toBe(true);
    expect(exported).toMatchObject({ ok: true, value: { renderPath: 'main-thread' } });
    if (!preview.ok || !exported.ok) return;
    expect(exported.value.overlayRects).toEqual(preview.value.overlayRects);
    expect(releaseBitmap).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledOnce();
  });
});
