import { test, expect } from '@playwright/test';
test('production worker denies closed-map tiles and rechecks live permission after restart', async ({
  page,
  context,
  isMobile,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  test.skip(process.env.RUN_OFFLINE_E2E !== '1', 'Requires production preview.');
  await context.route(
    /^https:\/\/(wmts\.nlsc\.gov\.tw|tile\.openstreetmap\.org|mt1\.google\.com)\//,
    (route) =>
      route.fulfill({
        path: 'tests/integration/fixtures/sample.png',
        contentType: 'image/png',
        headers: { 'access-control-allow-origin': '*' },
      }),
  );
  await page.goto('/');
  await expect(page.getByText('已可離線使用', { exact: true })).toBeVisible();
  const probe = async (z: number, y: number, x: number) => {
    const url = `https://wmts.nlsc.gov.tw/wmts/EMAP5/default/GoogleMapsCompatible/${z}/${y}/${x}`;
    const response = page.waitForResponse(url);
    await page.evaluate((url) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      document.body.append(img);
    }, url);
    return (await response).status();
  };
  expect(await probe(2, 0, 0)).toBe(403);
  await page.getByLabel('選取照片').setInputFiles('tests/integration/fixtures/editor-photo.png');
  await page.getByRole('button', { name: '座標', exact: true }).click();
  await page.getByRole('button', { name: '在地圖上選取' }).click();
  await page.getByRole('button', { name: '同意並開啟地圖' }).click();
  await expect(page.getByText('線上地圖', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '向東', exact: true }).click();
  await expect(page.getByRole('button', { name: '使用準星位置' })).toBeEnabled();
  const center = await page.locator('.map-preview > p').last().textContent();
  for (const layer of [/^Google 衛星$/, /臺灣通用電子地圖/]) {
    await page.getByRole('button', { name: '圖層', exact: true }).click();
    await page.getByRole('button', { name: layer }).click();
    await expect(page.getByText('線上地圖', { exact: true })).toBeVisible();
    await expect(page.locator('.map-preview > p').last()).toHaveText(center!);
    await expect(page.getByText('縮放 16')).toBeVisible();
  }
  await page.getByRole('button', { name: '圖層', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Google 路網疊加層' }).check();
  await page.getByRole('button', { name: 'OpenStreetMap', exact: true }).click();
  await expect(page.getByText('線上地圖', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '圖層', exact: true }).click();
  await expect(page.getByRole('checkbox')).toBeChecked();
  await page.getByRole('button', { name: '圖層', exact: true }).click();
  await expect(page.locator('.map-viewport a').filter({ hasText: 'OpenStreetMap' })).toBeVisible();
  await expect(page.locator('.map-viewport a').filter({ hasText: 'Google' })).toBeVisible();
  const viewport = page.locator('.map-host');
  await viewport.hover({ position: { x: 20, y: 30 } });
  if (isMobile)
    await viewport.dispatchEvent('wheel', { deltaY: -50, bubbles: true, cancelable: true });
  else await page.mouse.wheel(0, -50);
  await expect(page.getByText('縮放 16.5', { exact: true })).toBeVisible();
  await expect(page.locator('.map-preview > p').last()).toHaveText(center!);
  await page.getByRole('button', { name: '放大地圖' }).click();
  await expect(page.getByText('縮放 17.5', { exact: true })).toBeVisible();
  await expect(page.locator('.map-preview > p').last()).toHaveText(center!);
  await expect(page.getByRole('button', { name: '使用準星位置' })).toBeEnabled();
  await page.screenshot({ path: `build/map-${test.info().project.name}.png`, fullPage: true });
  expect(errors).toEqual([]);
  expect(await probe(2, 0, 1)).toBe(200);
  const cdp = await context.newCDPSession(page);
  await cdp.send('ServiceWorker.enable');
  await cdp.send('ServiceWorker.stopAllWorkers');
  expect(await probe(2, 1, 0)).toBe(200);
  await page.getByRole('button', { name: '撤銷地圖同意' }).click();
  expect(await probe(2, 1, 1)).toBe(403);
  expect(
    await page.evaluate(async () =>
      (
        await Promise.all(
          (await caches.keys()).map(async (key) =>
            (await (await caches.open(key)).keys()).map((r) => r.url),
          ),
        )
      )
        .flat()
        .some((url) => /wmts\.nlsc|tile\.openstreetmap|mt1\.google/.test(url)),
    ),
  ).toBe(false);
});
