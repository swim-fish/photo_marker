import { Buffer } from 'node:buffer';
import { test, expect } from '@playwright/test';
test('captures the delivered phone states and selected coordinate formats', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const capture = async (name: string) => {
    if (await page.locator('.photo').count())
      await expect(page.locator('.photo')).toHaveAttribute('aria-busy', 'false');
    if (await page.getByRole('img', { name: '照片預覽' }).count())
      await page
        .getByRole('img', { name: '照片預覽' })
        .evaluate((img: HTMLImageElement) => img.decode());
    if (await page.locator('.preview').count()) {
      await expect(page.locator('.preview')).toHaveAttribute('aria-busy', 'false');
      await page
        .getByRole('img', { name: '樣板浮水印預覽' })
        .evaluate((img: HTMLImageElement) => img.decode());
    }
    await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
  };
  await capture('01-import');
  const jpeg = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 1200;
    c.height = 900;
    const ctx = c.getContext('2d')!,
      gradient = ctx.createLinearGradient(0, 0, 1200, 900);
    gradient.addColorStop(0, '#98baa1');
    gradient.addColorStop(1, '#406d57');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 900);
    return c.toDataURL('image/jpeg').split(',')[1];
  });
  await page.getByLabel('選取照片').setInputFiles({
    name: 'field.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from(jpeg, 'base64'),
  });
  await capture('02-editor-missing-gps');
  await page.getByRole('button', { name: '座標', exact: true }).click();
  await capture('03-coordinate');
  await page.getByLabel('緯度', { exact: true }).fill('25.033');
  await page.getByLabel('經度', { exact: true }).fill('121.5654');
  await page.getByRole('button', { name: '使用輸入的座標' }).click();
  for (const format of ['TWD97', 'MGRS', 'WGS84']) {
    await page.getByRole('button', { name: '座標', exact: true }).click();
    await page.getByRole('button', { name: format, exact: true }).click();
    await capture(`04-coordinate-${format}`);
    await page.getByRole('button', { name: '套用', exact: true }).click();
  }
  await page.getByRole('button', { name: '四角文字', exact: true }).click();
  await page.getByLabel('左上文字').fill('現場記錄');
  await capture('05-corners');
  await page.getByRole('button', { name: '文字樣式與底色' }).click();
  await capture('06-rgba');
  await page.getByRole('button', { name: '套用', exact: true }).click();
  await page.getByRole('button', { name: '樣板', exact: true }).click();
  await capture('07-templates');
  await page.getByRole('button', { name: '編輯目前樣板' }).click();
  await page.getByRole('button', { name: /^浮水印/ }).click();
  await page.getByLabel('啟用浮水印').check();
  await page.getByLabel('浮水印文字', { exact: true }).fill('FIELD');
  await capture('08-single-watermark');
  await page.getByRole('button', { name: '隨機重複', exact: true }).click();
  await capture('09-repeat-watermark');
  await page.getByRole('button', { name: '完成，返回樣板' }).click();
  await page.getByRole('button', { name: '儲存變更' }).click();
  await page.getByRole('button', { name: '套用', exact: true }).click();
  await expect(page.getByText(/已自動儲存草稿/)).toBeVisible();
  await capture('10-editor');
  await page.getByRole('button', { name: '儲存照片', exact: true }).click();
  await capture('11-export');
});
