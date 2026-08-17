import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { expect, test } from '../fixtures';

const photoFixture = resolve(process.cwd(), 'tests/integration/fixtures/sample.png');

test.describe('coordinate formats and consented map preview', () => {
  test('accepts DMS, derives MGRS, and keeps manual provenance visible', async ({
    page,
    viewportKind,
  }) => {
    test.skip(viewportKind !== 'desktop', 'This journey is scoped to the desktop project.');
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
        await route.continue();
        return;
      }
      await route.abort();
    });

    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles(photoFixture);
    await page.getByLabel('Input format').selectOption('WGS84_DMS');
    await page.getByLabel('WGS84 DMS coordinate').fill('25°2′1″ N, 121°33′52.099″ E');
    await page.getByRole('button', { name: 'Use manual coordinate' }).click();
    await expect(
      page.getByText(/Manual input: 25° 02′ 01\.000″ N, 121° 33′ 52\.099″ E/i),
    ).toBeVisible();

    await page.getByLabel('Display format').selectOption('MGRS');
    await expect(page.getByText(/51R\s*UH/i).first()).toBeVisible();
    await expect(page.getByText('Manual input', { exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'Overlays' }).click();
    await expect(page.getByText(/Manual input: 51R/i).first()).toBeVisible();
  });

  test('issues no map request before consent and isolates close and revocation', async ({
    page,
    viewportKind,
  }) => {
    test.skip(viewportKind !== 'desktop', 'This journey is scoped to the desktop project.');
    const tileBody = await readFile(photoFixture);
    const mapRequests: string[] = [];
    await page.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.hostname === 'wmts.nlsc.gov.tw') {
        mapRequests.push(request.url());
        expect(request.method()).toBe('GET');
        expect(request.postData()).toBeNull();
        await route.fulfill({ body: tileBody, contentType: 'image/png' });
        return;
      }
      if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
        await route.continue();
        return;
      }
      await route.abort();
    });

    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles(photoFixture);
    await page.getByLabel(/Latitude \(WGS84 decimal degrees\)/i).fill('25.033');
    await page.getByLabel(/Longitude \(WGS84 decimal degrees\)/i).fill('121.5654');
    await page.getByRole('button', { name: 'Use manual coordinate' }).click();
    await expect(page.getByText(/Manual input: 25\.033000, 121\.565400/)).toBeVisible();
    expect(mapRequests).toHaveLength(0);

    await page.getByRole('button', { name: 'Preview on map' }).click();
    const disclosure = page.getByRole('dialog', { name: 'Online map disclosure' });
    await expect(disclosure).toBeVisible();
    expect(mapRequests).toHaveLength(0);
    await disclosure.getByRole('button', { name: 'Decline' }).click();
    expect(mapRequests).toHaveLength(0);

    await page.getByRole('button', { name: 'Preview on map' }).click();
    await disclosure.getByRole('button', { name: 'Accept and open map' }).click();
    const onlineStatus = page.getByRole('status').filter({ hasText: /^Online map$/ });
    await expect(onlineStatus).toBeVisible();
    await expect.poll(() => mapRequests.length).toBeGreaterThan(0);
    for (const url of mapRequests) {
      expect(url).toMatch(
        /^https:\/\/wmts\.nlsc\.gov\.tw\/wmts\/EMAP5\/default\/GoogleMapsCompatible\/\d+\/\d+\/\d+$/,
      );
      expect(url).not.toContain('25.033');
      expect(url).not.toContain('121.5654');
    }
    await expect(
      page.getByRole('link', { name: /Data source: National Land Surveying/i }),
    ).toBeVisible();
    await expect(page.getByText(/Manual input: 25\.033000, 121\.565400/)).toBeVisible();

    await page.getByRole('button', { name: 'Close map' }).click();
    const afterClose = mapRequests.length;
    await page.waitForTimeout(200);
    expect(mapRequests).toHaveLength(afterClose);

    await page.getByRole('button', { name: 'Preview on map' }).click();
    await expect(disclosure).not.toBeVisible();
    await expect(onlineStatus).toBeVisible();
    await page.getByRole('button', { name: 'Revoke consent' }).click();
    const afterRevoke = mapRequests.length;
    await page.waitForTimeout(200);
    expect(mapRequests).toHaveLength(afterRevoke);
    await expect(page.getByText(/consent was revoked/i)).toBeVisible();
    await expect(page.getByText(/Manual input: 25\.033000, 121\.565400/)).toBeVisible();
  });
});
