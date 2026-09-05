import type { BrowserContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';
export async function completeOfflineDraftJourney(
  page: Page,
  context: BrowserContext,
): Promise<void> {
  await page.goto('/');
  await expect(page.getByText('已可離線使用', { exact: true })).toBeVisible({ timeout: 15000 });
  await page.getByLabel('選取照片').setInputFiles('tests/integration/fixtures/editor-photo.png');
  await page.getByRole('button', { name: '座標', exact: true }).click();
  await page.getByLabel('緯度', { exact: true }).fill('25.033');
  await page.getByLabel('經度', { exact: true }).fill('121.5654');
  await page.getByRole('button', { name: '使用輸入的座標' }).click();
  await expect(page.getByText(/已自動儲存草稿/)).toBeVisible();
  const external: string[] = [];
  context.on('request', (request) => {
    if (
      request.url().startsWith('http') &&
      !['127.0.0.1', 'localhost'].includes(new URL(request.url()).hostname)
    )
      external.push(request.url());
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('已可離線使用', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '還原草稿' }).click();
  await expect(page.getByText('25.033000, 121.565400', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '四角文字', exact: true }).click();
  await page.getByLabel('左上文字', { exact: true }).fill('離線記錄');
  await page.getByRole('button', { name: '套用', exact: true }).click();
  await page.getByRole('button', { name: '儲存照片', exact: true }).click();
  const output = page.waitForEvent('download');
  await page.getByRole('button', { name: '下載照片', exact: true }).click();
  await output;
  await expect(page.getByText('下載已開始')).toBeVisible();
  expect(external).toEqual([]);
  const urls = await page.evaluate(async () =>
    (
      await Promise.all(
        (await caches.keys()).map(async (name) =>
          (await (await caches.open(name)).keys()).map((request) => request.url),
        ),
      )
    ).flat(),
  );
  expect(urls.some((url) => url.includes('/fonts/'))).toBe(true);
  expect(urls.some((url) => /wmts\.nlsc|blob:|\/photos\/|\/drafts\//.test(url))).toBe(false);
  await page.reload();
  await expect(page.getByRole('button', { name: '還原草稿' })).toBeVisible();
  await context.setOffline(false);
}
