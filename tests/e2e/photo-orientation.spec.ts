import { expect, test } from '@playwright/test';

/** Add a little-endian EXIF orientation APP1 segment without changing JPEG pixels. */
function withExifOrientation(jpeg: Buffer, orientation: number): Buffer {
  const tiff = Buffer.alloc(26);
  tiff.write('II', 0, 'ascii');
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(1, 8);
  tiff.writeUInt16LE(0x0112, 10);
  tiff.writeUInt16LE(3, 12);
  tiff.writeUInt32LE(1, 14);
  tiff.writeUInt16LE(orientation, 18);
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'ascii'), tiff]);
  const app1 = Buffer.alloc(payload.length + 4);
  app1.writeUInt16BE(0xffe1, 0);
  app1.writeUInt16BE(payload.length + 2, 2);
  payload.copy(app1, 4);
  return Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]);
}

test('browser JPEG decoder and renderer retain the intended orientation for EXIF 1–8', async ({
  page,
}) => {
  await page.goto('/');
  const rawJpeg = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 100;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#f00';
    context.fillRect(0, 0, 80, 50);
    context.fillStyle = '#0f0';
    context.fillRect(80, 0, 80, 50);
    context.fillStyle = '#00f';
    context.fillRect(0, 50, 80, 50);
    context.fillStyle = '#ff0';
    context.fillRect(80, 50, 80, 50);
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((value) => resolve(value!), 'image/jpeg', 1),
    );
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });

  const results: Array<{
    orientation: number;
    decoded: readonly number[];
    preview: readonly number[];
    preserveRaw: readonly number[];
  }> = [];
  for (let orientation = 1; orientation <= 8; orientation += 1) {
    const jpeg = withExifOrientation(Buffer.from(rawJpeg), orientation);
    const result = await page.evaluate(
      async ({ bytes, orientation }) => {
        const rendererModulePath: string = '/src/renderer/renderPhoto.ts';
        const { renderPhoto } = (await import(rendererModulePath)) as {
          renderPhoto: (
            source: Blob,
            options: Record<string, unknown>,
          ) => Promise<{ ok: true; value: { blob: Blob } } | { ok: false }>;
        };
        const source = new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' });
        const sample = async (blob: Blob) => {
          const bitmap = await createImageBitmap(blob);
          const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
          const context = canvas.getContext('2d')!;
          context.drawImage(bitmap, 0, 0);
          bitmap.close();
          return [
            canvas.width,
            canvas.height,
            ...context.getImageData(
              Math.round(canvas.width * 0.25),
              Math.round(canvas.height * 0.25),
              1,
              1,
            ).data,
          ];
        };
        const decoded = await sample(source);
        const preview = await renderPhoto(source, {
          mode: 'preview',
          orientation: orientation as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
          outputFormat: 'image/png',
          metadataMode: 'removeSupported',
          overlays: [],
          workerAvailable: false,
        });
        const preserveRaw = await renderPhoto(source, {
          mode: 'export',
          orientation: orientation as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
          outputFormat: 'image/jpeg',
          metadataMode: 'preserveSupported',
          overlays: [],
          workerAvailable: false,
        });
        if (!preview.ok || !preserveRaw.ok) throw new Error('renderer failed');
        const rawBitmap = await createImageBitmap(preserveRaw.value.blob);
        try {
          const rawCanvas = new OffscreenCanvas(rawBitmap.width, rawBitmap.height);
          const rawContext = rawCanvas.getContext('2d')!;
          rawContext.drawImage(rawBitmap, 0, 0);
          return {
            orientation,
            decoded,
            preview: await sample(preview.value.blob),
            preserveRaw: [
              rawCanvas.width,
              rawCanvas.height,
              ...rawContext.getImageData(40, 25, 1, 1).data,
            ],
          };
        } finally {
          rawBitmap.close();
        }
      },
      { bytes: [...jpeg], orientation },
    );
    results.push(result);
  }

  for (const result of results) {
    expect(result.preview.slice(0, 2)).toEqual(result.decoded.slice(0, 2));
    expect(result.preview.slice(2)).toEqual(result.decoded.slice(2));
    expect(result.preserveRaw.slice(0, 2)).toEqual([160, 100]);
    expect(result.preserveRaw[2]).toBeGreaterThan(220);
    expect(result.preserveRaw[3]).toBeLessThan(35);
    expect(result.preserveRaw[4]).toBeLessThan(35);
  }
});
