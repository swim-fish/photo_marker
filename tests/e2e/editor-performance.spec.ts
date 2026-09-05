import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';
test('records twenty 12MP JPEG import edit and high-density export timings', async ({
  page,
}, testInfo) => {
  test.skip(
    process.env.RUN_EDITOR_PERF !== '1' || testInfo.project.name !== 'desktop-chrome',
    'Explicit desktop characterization.',
  );
  test.setTimeout(180000);
  await page.goto('/');
  const jpeg = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 4032;
    canvas.height = 3024;
    const context = canvas.getContext('2d')!,
      image = context.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const x = (i / 4) % 4032,
        y = Math.floor(i / 4 / 4032);
      image.data[i] = (x * 17 + y * 3) & 255;
      image.data[i + 1] = (x * 5 + y * 11) & 255;
      image.data[i + 2] = (x * 7 + y * 13) & 255;
      image.data[i + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
  });
  const results: { importMs: number; editMs: number; exportMs: number }[] = [];
  for (let run = 0; run < 20; run++) {
    const start = performance.now();
    await page.getByLabel('選取照片').setInputFiles({
      name: `perf-${run}.jpg`,
      mimeType: 'image/jpeg',
      buffer: Buffer.from(jpeg, 'base64'),
    });
    const preview = page.getByRole('img', { name: '照片預覽' });
    await expect
      .poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBe(1280);
    const importMs = performance.now() - start;
    await page.getByRole('button', { name: '四角文字', exact: true }).click();
    const before = await preview.getAttribute('src'),
      editStart = performance.now();
    await page.getByLabel('左上文字', { exact: true }).fill(`Run ${run}`);
    await expect.poll(() => preview.getAttribute('src'), { intervals: [25] }).not.toBe(before);
    const editMs = performance.now() - editStart;
    await page.getByRole('button', { name: '浮水印', exact: true }).click();
    await page.getByLabel('啟用浮水印').check();
    await page.getByLabel('浮水印文字', { exact: true }).fill('MARK');
    await page.getByRole('button', { name: '隨機重複', exact: true }).click();
    await page.getByLabel('重複密度').selectOption('high');
    await page.getByRole('button', { name: '套用', exact: true }).click();
    await page.getByRole('button', { name: '儲存照片', exact: true }).click();
    const exportStart = performance.now(),
      download = page.waitForEvent('download');
    await page.getByRole('button', { name: '下載照片', exact: true }).click();
    await (await download).path();
    results.push({ importMs, editMs, exportMs: performance.now() - exportStart });
  }
  const p95 = (key: keyof (typeof results)[number]) =>
    [...results].map((r) => r[key]).sort((a, b) => a - b)[18];
  const report = {
    fixture: 'synthetic 4032x3024 JPEG, 20 repeated text marks',
    runs: results,
    p95: { importMs: p95('importMs'), editMs: p95('editMs'), exportMs: p95('exportMs') },
  };
  console.log(`EDITOR_PERF ${JSON.stringify(report)}`);
  await testInfo.attach('editor-performance.json', {
    body: JSON.stringify(report, null, 2),
    contentType: 'application/json',
  });
});
