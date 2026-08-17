import { describe, expect, it } from 'vitest';

import type { PhotoOrientation } from '../../../src/domain/photos/types';
import { renderPhoto } from '../../../src/renderer/renderPhoto';
import { createPhotoFixtureFile, orientationFixtureNames } from '../../helpers/photoFixtures';

const overlay = {
  id: 'orientation-overlay',
  photoId: 'photo-orientation',
  role: 'freeform' as const,
  content: '台灣現場 🧭\n第二行',
  fontFamily: 'Noto Sans TC',
  fontSize: 0.04,
  textColor: '#ffffff',
  backgroundColor: '#111827',
  x: 0.12,
  y: 0.2,
  width: 0.28,
  height: 0.12,
  padding: 0.01,
  lineHeight: 1.2,
  order: 0,
  contrastStatus: 'acceptable' as const,
};

const renderFixture = async (blob: Blob, _plan: unknown, mime: 'image/jpeg' | 'image/png') =>
  blob.slice(0, blob.size, mime);

describe('single-photo orientation fidelity', () => {
  it('keeps display-oriented overlay geometry equivalent for EXIF orientations 1 through 8', async () => {
    let referenceRect: unknown;

    for (const [index, name] of orientationFixtureNames.entries()) {
      const orientation = (index + 1) as PhotoOrientation;
      const result = await renderPhoto(await createPhotoFixtureFile(name), {
        mode: 'preview',
        orientation,
        overlays: [overlay],
        renderCanvas: renderFixture,
      });

      expect(result.ok, name).toBe(true);
      if (!result.ok) continue;

      expect(result.value.overlayRects).toHaveLength(1);
      expect(result.value.plan.overlays[0].content).toBe(overlay.content);
      if (referenceRect === undefined) referenceRect = result.value.overlayRects[0];
      else expect(result.value.overlayRects[0]).toEqual(referenceRect);
    }
  });

  it('matches preview and export geometry while disclosing the upright normalization path', async () => {
    const source = await createPhotoFixtureFile('orientation-6.jpg');
    const preview = await renderPhoto(source, {
      mode: 'preview',
      orientation: 6,
      overlays: [overlay],
      renderCanvas: renderFixture,
    });
    const preserved = await renderPhoto(source, {
      mode: 'export',
      orientation: 6,
      outputFormat: 'image/jpeg',
      metadataMode: 'preserveSupported',
      overlays: [overlay],
      renderCanvas: renderFixture,
    });
    const normalized = await renderPhoto(source, {
      mode: 'export',
      orientation: 6,
      outputFormat: 'image/png',
      metadataMode: 'removeSupported',
      overlays: [overlay],
      renderCanvas: renderFixture,
    });

    expect(preview.ok).toBe(true);
    expect(preserved.ok).toBe(true);
    expect(normalized.ok).toBe(true);
    if (!preview.ok || !preserved.ok || !normalized.ok) return;

    expect(preserved.value.overlayRects).toEqual(preview.value.overlayRects);
    expect(normalized.value.overlayRects).toEqual(preview.value.overlayRects);
    expect(preserved.value.plan).toMatchObject({
      orientation: 6,
      orientationMode: 'preserveRaw',
    });
    expect(normalized.value.plan).toMatchObject({
      orientation: 1,
      orientationMode: 'bakeUpright',
      disclosureRequired: true,
    });
  });
});
