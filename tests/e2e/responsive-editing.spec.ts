import { resolve } from 'node:path';

import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';

const photoFixture = resolve(process.cwd(), 'tests/integration/fixtures/sample.png');

async function openOverlayEditor(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles(photoFixture);
  await page.getByLabel(/Latitude \(WGS84 decimal degrees\)/i).fill('25.033');
  await page.getByLabel(/Longitude \(WGS84 decimal degrees\)/i).fill('121.5654');
  await page.getByRole('button', { name: 'Use manual coordinate' }).click();
  await page.getByRole('tab', { name: 'Overlays' }).click();
  await page.getByRole('button', { name: 'Add title' }).click();
  await page.getByRole('button', { name: 'Add free-form text' }).click();
}

async function expectMinimumTouchTargets(page: Page): Promise<void> {
  const controls = await page.locator('button[aria-label^="Move "]').all();
  expect(controls.length).toBeGreaterThan(0);
  for (const control of controls) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
}

test('keeps empty desktop rows content-sized', async ({ page, viewportKind }) => {
  test.skip(viewportKind !== 'desktop', 'This layout assertion uses the desktop project.');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const header = await page.locator('.app-header').boundingBox();
  const status = await page.locator('.application-status').boundingBox();
  expect(header).not.toBeNull();
  expect(status).not.toBeNull();
  expect(header!.height).toBeLessThan(100);
  expect(status!.height).toBeLessThan(160);
});

test('uses static tablet actions and 44px overlay controls', async ({ page, viewportKind }) => {
  test.skip(viewportKind !== 'desktop', 'This layout assertion uses the desktop project.');
  await page.setViewportSize({ width: 768, height: 1024 });
  await openOverlayEditor(page);

  await expect(page.locator('.primary-actions')).toHaveCSS('position', 'static');
  await expectMinimumTouchTargets(page);
});

test('keeps focused mobile controls above the sticky action', async ({ page, viewportKind }) => {
  test.skip(viewportKind !== 'mobile', 'This layout assertion uses the mobile project.');
  await page.setViewportSize({ width: 375, height: 812 });
  await openOverlayEditor(page);

  await expect(page.locator('.primary-actions')).toHaveCSS('position', 'sticky');
  await expectMinimumTouchTargets(page);
  const background = page.locator('.quick-editor').getByLabel('Background');
  await background.focus();
  const backgroundBox = await background.boundingBox();
  const actionBox = await page.locator('.primary-actions').boundingBox();
  expect(backgroundBox).not.toBeNull();
  expect(actionBox).not.toBeNull();
  expect(backgroundBox!.y + backgroundBox!.height).toBeLessThanOrEqual(actionBox!.y);
});

test('supports tap-to-edit and direct pointer dragging', async ({ page }) => {
  await openOverlayEditor(page);

  const titleOverlay = page.getByRole('button', { name: /Select and move title overlay/i });
  await titleOverlay.click();
  const quickEditor = page.getByRole('region', { name: 'Quick edit selected text' });
  const text = quickEditor.getByRole('textbox', { name: 'Text', exact: true });
  await expect(text).toBeFocused();
  await text.fill('Directly edited title');
  await quickEditor.getByLabel('Text colour').fill('#ffcc00');

  const previewText = titleOverlay.locator('.overlay-content');
  await expect(previewText).toHaveText('Directly edited title');
  await expect(previewText).toHaveCSS('color', 'rgb(255, 204, 0)');
  const initialFontSize = Number.parseFloat(
    await previewText.evaluate((node) => getComputedStyle(node).fontSize),
  );
  await quickEditor.getByRole('button', { name: 'Increase text size' }).click();
  const increasedFontSize = Number.parseFloat(
    await previewText.evaluate((node) => getComputedStyle(node).fontSize),
  );
  expect(increasedFontSize).toBeGreaterThan(initialFontSize);

  const xInput = page.locator('.inspector').getByRole('spinbutton', { name: 'X', exact: true });
  const initialX = Number(await xInput.inputValue());
  await titleOverlay.scrollIntoViewIfNeeded();
  const box = await titleOverlay.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 40, box!.y + box!.height / 2 + 20);
  await expect(titleOverlay).toHaveClass(/dragging/);
  await page.mouse.up();
  await expect.poll(async () => Number(await xInput.inputValue())).toBeGreaterThan(initialX);
});
