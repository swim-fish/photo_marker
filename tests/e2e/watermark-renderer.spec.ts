import { test, expect } from '@playwright/test';
test('worker and fallback match watermark pixels through all eight orientations', async ({
  page,
}) => {
  test.skip(process.env.RUN_OFFLINE_E2E === '1', 'Module-level browser test runs against Vite.');
  await page.goto('/');
  const results = await page.evaluate(async () => {
    const workerPath = '/src/infrastructure/platform/renderWorkerClient.ts',
      renderPath = '/src/renderer/renderPhoto.ts',
      layoutPath = '/src/domain/watermarks/layout.ts';
    const { createRenderWorkerClient } = (await import(
      workerPath
    )) as typeof import('../../src/infrastructure/platform/renderWorkerClient');
    const { renderPhoto } = (await import(
      renderPath
    )) as typeof import('../../src/renderer/renderPhoto');
    const { arrangeWatermark } = (await import(
      layoutPath
    )) as typeof import('../../src/domain/watermarks/layout');
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 120;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#123456';
    ctx.fillRect(0, 0, 160, 120);
    const source = await new Promise<Blob>((resolve) =>
      c.toBlob((blob) => resolve(blob!), 'image/png'),
    );
    const client = createRenderWorkerClient(),
      output: boolean[] = [];
    const pixels = async (blob: Blob) => {
      const image = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(image.width, image.height);
      const x = canvas.getContext('2d')!;
      x.drawImage(image, 0, 0);
      image.close();
      return x.getImageData(0, 0, canvas.width, canvas.height).data;
    };
    try {
      for (const orientation of [1, 2, 3, 4, 5, 6, 7, 8] as const) {
        for (const metadataMode of ['preserveSupported', 'removeSupported'] as const) {
          const config = {
            enabled: true,
            kind: 'text' as const,
            text: '台灣',
            opacity: 0.25,
            mode: 'repeat' as const,
            singlePosition: 'center' as const,
            density: 'high' as const,
          };
          const options = {
            mode: 'export' as const,
            orientation,
            outputFormat: 'image/png' as const,
            metadataMode,
            overlays: [],
            watermark: {
              config,
              arrangement: arrangeWatermark('p', orientation < 5 ? 4 / 3 : 3 / 4, config)!,
              assets: [],
            },
          };
          const worker = await client.render(source, options),
            fallback = await renderPhoto(source, { ...options, workerAvailable: false });
          if (!worker.ok || !fallback.ok) {
            output.push(false);
            continue;
          }
          const a = await pixels(worker.value.blob),
            b = await pixels(fallback.value.blob);
          output.push(a.length === b.length && a.every((value, index) => value === b[index]));
        }
      }
    } finally {
      client.close();
    }
    return output;
  });
  expect(results).toHaveLength(16);
  expect(results.every(Boolean)).toBe(true);
});
