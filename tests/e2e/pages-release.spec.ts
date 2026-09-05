import { expect, test } from '@playwright/test';
import { version } from '../../package.json';

test('Pages release loads its version, fonts, and offline shell under the project path', async ({
  page,
  context,
  baseURL,
}) => {
  test.skip(process.env.PAGES_RELEASE_TEST !== '1', 'Requires a production Pages build.');
  const appUrl = new URL('/photo_marker/', baseURL).href;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(appUrl);
  await expect(page.getByLabel('版本資訊')).toHaveText(`Photo Marker v${version}`);
  const manifest = await (await context.request.get(`${appUrl}manifest.webmanifest`)).json();
  expect(manifest.start_url).toBe('/photo_marker/');
  expect(manifest.scope).toBe('/photo_marker/');
  for (const icon of manifest.icons) {
    expect((await context.request.get(new URL(icon.src, appUrl).href)).ok()).toBe(true);
  }
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await document.fonts.ready;
  });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const cachedPaths = await page.evaluate(async () => {
    const paths: string[] = [];
    for (const name of await caches.keys()) {
      if (!name.startsWith('photo-marker-shell-')) continue;
      paths.push(
        ...(await (await caches.open(name)).keys()).map((request) => new URL(request.url).pathname),
      );
    }
    return paths;
  });
  expect(cachedPaths).toContain('/photo_marker/index.html');
  expect(cachedPaths).toContain(
    '/photo_marker/fonts/noto-sans-tc-chinese-traditional-400-normal.woff2',
  );
  expect(cachedPaths.every((path) => path.startsWith('/photo_marker/'))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel('版本資訊')).toHaveText(`Photo Marker v${version}`);
  expect(errors).toEqual([]);
});
