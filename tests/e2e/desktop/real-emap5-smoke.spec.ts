import { resolve } from 'node:path';

import { expect, test } from '../fixtures';

const photoFixture = resolve(process.cwd(), 'tests/integration/fixtures/sample.png');

test('loads one real EMAP5 tile with CORS on Windows', async ({ page, viewportKind }, testInfo) => {
  test.skip(
    viewportKind !== 'desktop' || process.env.RUN_REAL_EMAP5 !== '1',
    'Run explicitly for the external-provider release smoke.',
  );

  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles(photoFixture);
  await page.getByLabel(/Latitude \(WGS84 decimal degrees\)/i).fill('25.033');
  await page.getByLabel(/Longitude \(WGS84 decimal degrees\)/i).fill('121.5654');
  await page.getByRole('button', { name: 'Use manual coordinate' }).click();
  await page.getByRole('button', { name: 'Preview on map' }).click();

  const tileResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.hostname === 'wmts.nlsc.gov.tw' && url.pathname.includes('/wmts/EMAP5/');
  });
  await page.getByRole('button', { name: 'Accept and open map' }).click();

  const response = await tileResponse;
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toMatch(/^image\/(?:jpeg|png)/);
  expect(response.headers()['access-control-allow-origin']).toBe('*');
  await expect(page.getByRole('status').filter({ hasText: /^Online map$/ })).toBeVisible();
  await expect(page.getByText(/map service is unavailable/i)).not.toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('desktop-map-preview.png'), fullPage: true });

  await page.getByRole('button', { name: 'Close map' }).click();
  await page.setViewportSize({ width: 320, height: 720 });
  const displayFormat = page.getByLabel('Display format');
  await displayFormat.focus();
  const displayBox = await displayFormat.boundingBox();
  const stickyBox = await page.locator('.primary-actions').boundingBox();
  expect(displayBox).not.toBeNull();
  expect(stickyBox).not.toBeNull();
  expect(displayBox!.y + displayBox!.height).toBeLessThanOrEqual(stickyBox!.y);
  await page.screenshot({ path: testInfo.outputPath('mobile-focused-coordinate.png') });
});
