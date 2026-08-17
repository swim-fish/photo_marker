import { resolve } from 'node:path';

import { expect, test } from './fixtures';

const photoFixture =
  process.env.TEST_PHOTO_PATH ?? resolve(process.cwd(), 'tests/integration/fixtures/sample.png');

test('keeps the guided editor usable at phone, tablet, and desktop sizes', async ({
  page,
  viewportKind,
}, testInfo) => {
  test.skip(
    viewportKind !== 'desktop',
    'One browser project supplies the three explicit viewports.',
  );

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles(photoFixture);
  await page.getByLabel(/Latitude \(WGS84 decimal degrees\)/i).fill('25.033');
  await page.getByLabel(/Longitude \(WGS84 decimal degrees\)/i).fill('121.5654');
  await page.getByRole('button', { name: 'Use manual coordinate' }).click();
  await page.getByRole('radio', { name: 'Multiple coordinates' }).check();
  await page.getByRole('checkbox', { name: 'TWD97 TM2' }).check();
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.getByRole('button', { name: 'Add title' }).click();
  await page.getByRole('button', { name: 'Add team' }).click();

  for (const viewport of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'phone', width: 375, height: 812 },
  ] as const) {
    await page.setViewportSize(viewport);
    await expect(page.locator('[data-step-page="text"]')).toBeVisible();
    await expect(page.locator('.step-actions')).toHaveCSS('position', 'fixed');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`${viewport.name}-guided-editor.png`),
      fullPage: false,
    });
  }
});
