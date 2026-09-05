import { jpegWithGps } from './photoData';
import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';
test('imports a real photo, cancels review and exports a separate copy', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Photo Marker' })).toBeVisible();
  const jpeg = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 900;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#64766f';
    context.fillRect(0, 0, 1200, 900);
    return canvas.toDataURL('image/jpeg').split(',')[1];
  });
  await page.getByLabel('選取照片').setInputFiles({
    name: 'field.jpg',
    mimeType: 'image/jpeg',
    buffer: jpegWithGps(Buffer.from(jpeg, 'base64')),
  });
  await expect(page.getByRole('heading', { name: '編輯照片' })).toBeVisible();
  await expect(page.getByRole('img', { name: '照片預覽' })).toBeVisible();
  await expect(page.getByText('來源：照片 GPS')).toBeVisible();
  await expect(page.getByText('25.033000, 121.565400', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '儲存照片', exact: true }).click();
  await expect(page.getByRole('heading', { name: '匯出照片' })).toBeVisible();
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await expect(page.getByRole('heading', { name: '編輯照片' })).toBeVisible();
  await page.getByRole('button', { name: '儲存照片', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '下載照片', exact: true }).click();
  expect((await download).suggestedFilename()).toContain('annotated');
  await expect(page.getByText('下載已開始')).toBeVisible();
});

test('manual zero coordinate, current-location confirmation and map consent', async ({
  page,
  context,
}) => {
  await page.route(
    /^https:\/\/(wmts\.nlsc\.gov\.tw|tile\.openstreetmap\.org|mt1\.google\.com)\//,
    (route) =>
      route.fulfill({
        path: 'tests/integration/fixtures/sample.png',
        contentType: 'image/png',
        headers: { 'access-control-allow-origin': '*' },
      }),
  );
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 25.033, longitude: 121.5654, accuracy: 10 });
  await page.goto('/');
  await page.getByLabel('選取照片').setInputFiles('tests/integration/fixtures/editor-photo.png');
  await page.getByRole('button', { name: '座標', exact: true }).click();
  if (!(await page.getByLabel('緯度', { exact: true }).isVisible()))
    await page.getByRole('button', { name: /^位置來源：/ }).click();
  await page.getByLabel('緯度', { exact: true }).fill('0');
  await page.getByLabel('經度', { exact: true }).fill('0');
  await page.getByRole('button', { name: '使用輸入的座標' }).click();
  await expect(page.getByText('0.000000, 0.000000', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '座標', exact: true }).click();
  if (!(await page.getByLabel('緯度', { exact: true }).isVisible()))
    await page.getByRole('button', { name: /^位置來源：/ }).click();
  await page.getByRole('button', { name: '使用目前位置' }).click();
  await expect(page.getByRole('heading', { name: '確認目前位置' })).toBeVisible();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.getByText('0.000000, 0.000000', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '座標', exact: true }).click();
  if (!(await page.getByLabel('緯度', { exact: true }).isVisible()))
    await page.getByRole('button', { name: /^位置來源：/ }).click();
  await page.getByRole('button', { name: '在地圖上選取' }).click();
  await expect(page.getByRole('dialog', { name: '地圖連線說明' })).toBeVisible();
  await page.getByRole('button', { name: '同意並開啟地圖' }).click();
  await page.getByRole('button', { name: '圖層', exact: true }).click();
  await page.getByRole('button', { name: /^Google 衛星$/ }).click();
  await page.getByRole('button', { name: '取消選取' }).click();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.getByText('0.000000, 0.000000', { exact: true })).toBeVisible();
});

test('corner defaults, RGBA, stable watermark and template isolation survive reopening', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('選取照片').setInputFiles('tests/integration/fixtures/editor-photo.png');
  await page.getByRole('button', { name: '四角文字', exact: true }).click();
  await page.getByLabel('左上文字', { exact: true }).fill('現場 A\n晴天');
  await page.getByRole('button', { name: '儲存為預設文字' }).click();
  await page.getByRole('button', { name: '文字樣式與底色' }).click();
  await page.getByLabel('RGBA 值').fill('rgba(24, 53, 47, 0.85)');
  await page.getByRole('button', { name: '套用', exact: true }).click();
  await page.getByRole('button', { name: '四角文字', exact: true }).click();
  await expect(page.getByLabel('左上文字', { exact: true })).toHaveValue('現場 A\n晴天');
  await page.getByRole('button', { name: '浮水印', exact: true }).click();
  await page.getByLabel('啟用浮水印').check();
  await page.getByLabel('浮水印文字', { exact: true }).fill('MARK');
  await page.getByRole('button', { name: '隨機重複', exact: true }).click();
  await page.getByRole('button', { name: '套用', exact: true }).click();
  await page.getByRole('button', { name: '樣板', exact: true }).click();
  await page.getByRole('button', { name: '＋ 自訂樣板' }).click();
  await page.getByLabel('樣板名稱').fill('工程巡查');
  await page.getByRole('button', { name: '儲存目前設定為樣板' }).click();
  await page.getByRole('button', { name: '設為預設：工程巡查' }).click();
  await page.getByRole('button', { name: '套用', exact: true }).click();
  await expect(page.getByText(/已自動儲存草稿/)).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '還原草稿' }).click();
  await expect(page.getByText('目前樣板：工程巡查')).toBeVisible();
  await page.getByRole('button', { name: '四角文字', exact: true }).click();
  await expect(page.getByLabel('左上文字', { exact: true })).toHaveValue('現場 A\n晴天');
  await page.getByRole('button', { name: '文字樣式與底色' }).click();
  await expect(page.getByLabel('RGBA 值')).toHaveValue('rgba(24, 53, 47, 0.85)');
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByLabel('選取照片').setInputFiles({
    name: 'second.png',
    mimeType: 'image/png',
    buffer: await (
      await import('node:fs/promises')
    ).readFile('tests/integration/fixtures/editor-photo.png'),
  });
  await expect(page.getByText('目前樣板：工程巡查')).toBeVisible();
  await page.getByRole('button', { name: '四角文字', exact: true }).click();
  await expect(page.getByLabel('左上文字', { exact: true })).toHaveValue('現場 A\n晴天');
});

test('PNG watermark and RGBA export use canonical pixels and retained assets', async ({ page }) => {
  await page.goto('/');
  const black = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 1000;
    c.height = 800;
    const x = c.getContext('2d')!;
    x.fillStyle = '#000';
    x.fillRect(0, 0, 1000, 800);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('選取照片').setInputFiles({
    name: 'black.png',
    mimeType: 'image/png',
    buffer: Buffer.from(black, 'base64'),
  });
  await page.getByRole('button', { name: '四角文字', exact: true }).click();
  await page.getByLabel('左上文字', { exact: true }).fill('A');
  await page.getByRole('button', { name: '文字樣式與底色' }).click();
  await page.getByLabel('RGBA 值').fill('rgba(255, 0, 0, 0.85)');
  await page.getByRole('button', { name: '套用', exact: true }).click();
  await expect(page.getByText(/已自動儲存草稿/)).toBeVisible();
  const rectangle = await page.evaluate(
    () =>
      new Promise<{ x: number; y: number; width: number; height: number }>((resolve) => {
        const opening = indexedDB.open('photo-marker-v2');
        opening.onsuccess = () => {
          const db = opening.result,
            request = db.transaction('revisions').objectStore('revisions').getAll();
          request.onsuccess = () => {
            const revisions = request.result.sort((a, b) => b.revision - a.revision);
            resolve(revisions[0].snapshot.overlays[0]);
            db.close();
          };
        };
      }),
  );
  await expect(page.locator('.photo')).toHaveAttribute('aria-busy', 'false');
  const previewPixel = await page
    .getByRole('img', { name: '照片預覽' })
    .evaluate(async (image: HTMLImageElement, rectangle) => {
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      return Array.from(
        ctx.getImageData(
          Math.round((rectangle.x + rectangle.width / 2) * canvas.width),
          Math.round((rectangle.y + rectangle.height) * canvas.height - 8),
          1,
          1,
        ).data,
      );
    }, rectangle);
  expect(previewPixel[0]).toBeGreaterThanOrEqual(216);
  await page.getByRole('button', { name: '儲存照片', exact: true }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: '下載照片', exact: true }).click();
  const path = await (await downloading).path();
  const bytes = await (await import('node:fs/promises')).readFile(path!);
  const pixel = await page.evaluate(
    async ({ base64, rectangle }) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const c = document.createElement('canvas');
      c.width = bitmap.width;
      c.height = bitmap.height;
      const context = c.getContext('2d')!;
      context.drawImage(bitmap, 0, 0);
      return Array.from(
        context.getImageData(
          Math.round((rectangle.x + rectangle.width / 2) * c.width),
          Math.round((rectangle.y + rectangle.height) * c.height - 8),
          1,
          1,
        ).data,
      );
    },
    { base64: bytes.toString('base64'), rectangle },
  );
  expect(pixel[0]).toBeGreaterThanOrEqual(216);
  expect(pixel[0]).toBeLessThanOrEqual(218);
  expect(pixel.slice(1)).toEqual([0, 0, 255]);
  await page.getByRole('button', { name: '繼續編輯' }).click();
  await page.getByRole('button', { name: '四角文字', exact: true }).click();
  await page.getByRole('button', { name: '浮水印', exact: true }).click();
  await page.getByLabel('啟用浮水印').check();
  await page.getByLabel('浮水印類型').selectOption('image');
  await page.getByLabel('選取 PNG 浮水印').setInputFiles('tests/integration/fixtures/sample.png');
  await page.getByRole('button', { name: '套用', exact: true }).click();
  await expect(page.getByText(/已自動儲存草稿/)).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '還原草稿' }).click();
  await page.getByRole('button', { name: '四角文字', exact: true }).click();
  await page.getByRole('button', { name: '浮水印', exact: true }).click();
  await expect(page.getByLabel('浮水印類型')).toHaveValue('image');
  await expect(page.getByLabel('啟用浮水印')).toBeChecked();
});

test('template quota failure preserves the active editor and retry works', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('選取照片').setInputFiles('tests/integration/fixtures/editor-photo.png');
  await page.getByRole('button', { name: '樣板', exact: true }).click();
  await page.getByRole('button', { name: '＋ 自訂樣板' }).click();
  await page.getByLabel('樣板名稱').fill('可重試樣板');
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<typeof original>) {
      if (this.name === 'templates') {
        IDBObjectStore.prototype.put = original;
        throw new DOMException('test quota', 'QuotaExceededError');
      }
      return original.apply(this, args);
    };
  });
  await page.getByRole('button', { name: '儲存目前設定為樣板' }).click();
  await expect(page.getByRole('alert')).toHaveText('樣板儲存失敗，請重試。');
  await expect(page.getByRole('button', { name: '設為預設：可重試樣板' })).toHaveCount(0);
  await page.getByRole('button', { name: '儲存目前設定為樣板' }).click();
  await expect(page.getByRole('button', { name: '設為預設：可重試樣板' })).toBeVisible();
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await expect(page.getByText('目前樣板：戶外紀錄')).toBeVisible();
});
