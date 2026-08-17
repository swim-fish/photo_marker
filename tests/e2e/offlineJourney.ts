import { resolve } from 'node:path';

import type { BrowserContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';

const photoFixture = resolve(process.cwd(), 'tests/integration/fixtures/sample.png');

export async function completeOfflineDraftJourney(
  page: Page,
  context: BrowserContext,
): Promise<void> {
  await page.goto('/');
  await expect(page.getByText('Offline ready', { exact: true })).toBeVisible({ timeout: 10_000 });

  await page.locator('input[type="file"]').setInputFiles(photoFixture);
  await page.getByLabel(/Latitude \(WGS84 decimal degrees\)/i).fill('25.033');
  await page.getByLabel(/Longitude \(WGS84 decimal degrees\)/i).fill('121.5654');
  await page.getByRole('button', { name: 'Use manual coordinate' }).click();
  await expect(page.getByText(/Saved locally|Best-effort local draft/i)).toBeVisible();

  await page.reload();
  const recovery = page.getByRole('dialog', { name: /resume local draft/i });
  await expect(recovery).toBeVisible();
  await recovery.getByRole('button', { name: 'Resume draft' }).click();
  await expect(page.getByText(/Manual input: 25\.033000, 121\.565400/)).toBeVisible();
  expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  expect(
    await page.evaluate(async () => {
      const names = await caches.keys();
      const entries = await Promise.all(
        names.map(async (name) => ({
          name,
          urls: (await (await caches.open(name)).keys()).map((request) => request.url),
        })),
      );
      return entries;
    }),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: expect.stringMatching(/^photo-marker-shell-/),
        urls: expect.arrayContaining([expect.stringContaining('/assets/index-')]),
      }),
    ]),
  );

  const offlineErrors: string[] = [];
  page.on('pageerror', (error) => offlineErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') offlineErrors.push(message.text());
  });
  page.on('requestfailed', (request) =>
    offlineErrors.push(`${request.url()}: ${request.failure()?.errorText ?? 'request failed'}`),
  );
  await context.setOffline(true);
  const offlineResponse = await page.reload();
  expect(offlineResponse?.status()).toBe(200);
  expect(offlineErrors).toEqual([]);
  expect(await page.locator('body').innerText()).toContain('Photo Marker');
  await expect(page.getByText('Offline ready', { exact: true })).toBeVisible();
  // Chromium's DevTools offline emulation does not update navigator.onLine.
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.getByText('Working offline', { exact: true })).toBeVisible();
  await expect(recovery).toBeVisible();
  await recovery.getByRole('button', { name: 'Resume draft' }).click();

  await page.getByRole('button', { name: 'Review export' }).click();
  const review = page.getByRole('dialog', { name: /export review/i });
  const downloadPromise = page.waitForEvent('download');
  await review.getByRole('button', { name: /^Export$/i }).click();
  await downloadPromise;
  await expect(page.getByRole('status').filter({ hasText: /^Success:/i })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('dialog', { name: /resume local draft/i })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Import photos' })).toBeVisible();
  await context.setOffline(false);
}
