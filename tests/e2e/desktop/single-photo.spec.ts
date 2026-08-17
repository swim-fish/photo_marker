import { resolve } from 'node:path';

import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures';

const photoFixture = resolve(process.cwd(), 'tests/integration/fixtures/sample.png');

async function blockExternalRequests(page: Page) {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
      await route.continue();
      return;
    }
    await route.abort();
  });
}

test.describe('single-photo desktop journey', () => {
  test('shows empty and unsupported-input states without live network access', async ({
    page,
    viewportKind,
  }) => {
    test.skip(viewportKind !== 'desktop', 'This journey is scoped to the desktop project.');
    await blockExternalRequests(page);
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Import photos' })).toBeVisible();
    await expect(page.getByText(/JPEG and PNG/i)).toBeVisible();
    const input = page.locator('input[type="file"]');
    await input.setInputFiles({
      name: 'unsupported.gif',
      mimeType: 'image/gif',
      buffer: Buffer.from('deterministic unsupported fixture'),
    });

    await expect(page.getByRole('alert')).toHaveText('This photo format is not supported.');
    await expect(page.getByRole('alert')).not.toContainText('unsupported-format');
    await expect(page.getByRole('button', { name: 'Review export' })).toBeDisabled();
  });

  test('shows a safe message instead of a malformed metadata diagnostic code', async ({
    page,
    viewportKind,
  }) => {
    test.skip(viewportKind !== 'desktop', 'This journey is scoped to the desktop project.');
    await blockExternalRequests(page);
    await page.goto('/');

    await page.locator('input[type="file"]').setInputFiles({
      name: 'truncated.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x40, 0x45, 0x78, 0x69, 0x66]),
    });

    await expect(page.getByRole('alert')).toHaveText('The photo metadata is malformed.');
    await expect(page.getByRole('alert')).not.toContainText('malformed-metadata');
  });

  test('completes import, review, and export with keyboard-only actions', async ({
    page,
    viewportKind,
  }) => {
    test.skip(viewportKind !== 'desktop', 'This journey is scoped to the desktop project.');
    await blockExternalRequests(page);
    await page.goto('/');

    await page.locator('input[type="file"]').setInputFiles(photoFixture);
    await expect(page.getByRole('img', { name: /Preview of sample\.png/i })).toBeVisible();

    await page.getByLabel(/Latitude \(WGS84 decimal degrees\)/i).fill('25.033');
    await page.getByLabel(/Longitude \(WGS84 decimal degrees\)/i).fill('121.5654');
    const useManual = page.getByRole('button', { name: 'Use manual coordinate' });
    await useManual.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText(/Manual input: 25\.033000, 121\.565400/)).toBeVisible();

    await page.getByRole('button', { name: 'Text', exact: true }).click();
    await page.getByRole('button', { name: 'Add free-form text' }).click();
    await page
      .getByRole('region', { name: 'Quick edit selected text' })
      .getByRole('textbox', { name: 'Text', exact: true })
      .fill('Inspection complete');

    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const review = page.getByRole('button', { name: 'Review export' });
    await expect(review).toBeEnabled();
    await review.focus();
    await page.keyboard.press('Enter');

    const reviewDialog = page.getByRole('dialog', { name: /export review/i });
    await expect(reviewDialog).toBeVisible();
    const exportButton = reviewDialog.getByRole('button', { name: /^Export$/i });
    await expect(exportButton).toBeEnabled();
    await exportButton.focus();
    const downloadPromise = page.waitForEvent('download');
    await page.keyboard.press('Enter');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/sample/i);
    await expect(page.getByRole('status').filter({ hasText: /^Success:/i })).toBeVisible();
  });
});
