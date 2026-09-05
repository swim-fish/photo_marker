import { it, expect } from 'vitest';
import { createRenderPlan, createPreviewPlan } from '../../../src/renderer/canvasRenderer';
it('bounds preview pixels while preserving normalized layout and full-size export', () => {
  const plan = createRenderPlan({
    rawWidth: 4032,
    rawHeight: 3024,
    orientation: 6,
    sourceFormat: 'image/jpeg',
    outputFormat: 'image/jpeg',
    metadataMode: 'preserveSupported',
    overlays: [],
  });
  const preview = createPreviewPlan(plan);
  expect([preview.displayWidth, preview.displayHeight]).toEqual([960, 1280]);
  expect(preview.orientationMode).toBe('bakeUpright');
  expect([plan.outputWidth, plan.outputHeight]).toEqual([4032, 3024]);
});
