import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { jpegWithGps } from './photoData';

test('offers original-file selection and recovers GPS from bytes supplied by a document provider', async ({
  page,
  baseURL,
}) => {
  await page.goto(
    new URL(process.env.PAGES_RELEASE_TEST === '1' ? '/photo_marker/' : '/', baseURL).href,
  );
  const android = await page.evaluate(() => /Android/i.test(navigator.userAgent));
  if (android)
    await expect(page.getByLabel('選取照片', { exact: true })).not.toHaveAttribute('accept');
  else
    await expect(page.getByLabel('選取照片', { exact: true })).toHaveAttribute(
      'accept',
      'image/jpeg,image/png',
    );

  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 900;
    canvas.getContext('2d')!.fillRect(0, 0, 1200, 900);
    return canvas.toDataURL('image/jpeg').split(',')[1];
  });
  await page.getByLabel('選取照片', { exact: true }).setInputFiles({
    name: 'camera.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from(image, 'base64'),
  });
  await expect(page.getByText('未讀取到照片 GPS', { exact: true })).toBeVisible();
  await expect(page.getByText('這張照片沒有 GPS', { exact: true })).toHaveCount(0);
  const picker = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '從檔案選取原圖', exact: true }).click();
  const chooser = await picker;
  expect(await chooser.element().getAttribute('accept')).toBeNull();
  await chooser.setFiles({
    name: 'camera.jpg',
    mimeType: 'application/octet-stream',
    buffer: jpegWithGps(Buffer.from(image, 'base64')),
  });
  await expect(page.getByText('來源：照片 GPS')).toBeVisible();
  await expect(page.getByText('25.033000, 121.565400', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: '照片預覽' })).toBeVisible();
  await page.getByLabel('選取原始照片檔案').setInputFiles({
    name: 'not-a-photo.jpg',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('not a photo'),
  });
  await expect(page.getByRole('alert')).toContainText('請選取支援範圍內的 JPEG 或 PNG');
  await expect(page.getByText('25.033000, 121.565400', { exact: true })).toBeVisible();
});
