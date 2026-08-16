import { Buffer } from 'node:buffer';
import { deflateSync } from 'node:zlib';

import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures';

const width = 4032;
const height = 3024;

function crc32(input: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of input) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const name = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  name.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length);
  return chunk;
}

function representativePng(): Buffer {
  const stride = width * 4 + 1;
  const rows = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * stride;
    rows[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = row + 1 + x * 4;
      rows[offset] = (x * 17 + y * 3) & 0xff;
      rows[offset + 1] = (x * 5 + y * 11) & 0xff;
      rows[offset + 2] = (x * 7 + y * 13) & 0xff;
      rows[offset + 3] = 0xff;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(rows, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

async function blockExternalRequests(page: Page): Promise<void> {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
      await route.continue();
      return;
    }
    await route.abort();
  });
}

test('records the three-run 4032x3024 single-photo baseline', async ({ page, viewportKind }) => {
  test.skip(viewportKind !== 'desktop', 'The first-functional baseline uses desktop Chrome.');
  test.setTimeout(120_000);
  await blockExternalRequests(page);
  const fixture = representativePng();
  const results: Array<{ previewMs: number; exportMs: number }> = [];

  for (let run = 1; run <= 3; run += 1) {
    await page.goto('/');
    const previewStarted = performance.now();
    await page.locator('input[type="file"]').setInputFiles({
      name: `baseline-${run}.png`,
      mimeType: 'image/png',
      buffer: fixture,
    });
    const preview = page.getByRole('img', { name: new RegExp(`baseline-${run}\\.png`, 'i') });
    await expect(preview).toBeVisible();
    await expect
      .poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBe(width);
    const previewMs = performance.now() - previewStarted;

    await page.getByLabel(/Latitude \(WGS84 decimal degrees\)/i).fill('25.033');
    await page.getByLabel(/Longitude \(WGS84 decimal degrees\)/i).fill('121.5654');
    await page.getByRole('button', { name: 'Use manual coordinate' }).click();
    await page.getByRole('tab', { name: 'Overlays' }).click();
    await page.getByRole('button', { name: 'Add free-form text' }).click();
    await page.getByLabel('Content').fill(`Baseline run ${run}`);
    await page.getByRole('button', { name: 'Review export' }).click();

    const exportStarted = performance.now();
    const downloadPromise = page.waitForEvent('download');
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^Export$/ })
      .click();
    const download = await downloadPromise;
    await download.path();
    const exportMs = performance.now() - exportStarted;
    results.push({ previewMs, exportMs });
  }

  console.log(`PERF_BASELINE ${JSON.stringify({ width, height, runs: results })}`);
});
