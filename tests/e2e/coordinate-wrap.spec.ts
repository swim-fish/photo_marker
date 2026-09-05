import { test, expect } from '@playwright/test';

test('coordinate wrapping, MGRS precision descriptions and template preference survive saving', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/');
  await page.getByLabel('選取照片').setInputFiles('tests/integration/fixtures/editor-photo.png');
  await page.getByRole('button', { name: '座標', exact: true }).click();
  await page.getByLabel('緯度', { exact: true }).fill('25.033123');
  await page.getByLabel('經度', { exact: true }).fill('121.565456');
  await page.getByRole('button', { name: '使用輸入的座標' }).click();
  await page.getByRole('button', { name: '座標', exact: true }).click();
  await page.getByRole('button', { name: 'TWD97', exact: true }).click();
  await page.getByLabel('座標換行', { exact: true }).selectOption('auto');
  const output = page.getByLabel('座標格式預覽');
  await expect(output.locator('span')).toHaveCount(2);
  await expect(output.locator('span').nth(0)).toContainText('E 307062.413,');
  await expect(output.locator('span').nth(1)).toContainText('N 2769565.485');
  await page.getByLabel('座標換行', { exact: true }).selectOption('nowrap');
  await expect(output.locator('span')).toHaveCount(1);
  await expect.poll(() => output.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.getByRole('button', { name: 'MGRS', exact: true }).click();
  await expect(page.getByLabel('座標換行', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('座標換行', { exact: true })).toHaveValue('nowrap');
  const precision = page.getByLabel('精度', { exact: true });
  await expect(precision.locator('option')).toHaveText([
    '0 位／軸 · 100,000 × 100,000 m',
    '1 位／軸 · 10,000 × 10,000 m',
    '2 位／軸 · 1,000 × 1,000 m',
    '3 位／軸 · 100 × 100 m',
    '4 位／軸 · 10 × 10 m',
    '5 位／軸 · 1 × 1 m',
  ]);
  await precision.selectOption('3');
  await page.getByRole('button', { name: '套用', exact: true }).click();
  await page.getByRole('button', { name: '樣板', exact: true }).click();
  await page.getByRole('button', { name: '＋ 自訂樣板' }).click();
  await page.getByLabel('樣板名稱').fill('單行座標');
  await page.getByLabel('設為下次匯入的預設樣板').check();
  await page.getByRole('button', { name: '儲存目前設定為樣板' }).click();
  await expect(page.getByRole('button', { name: '設為預設：單行座標' })).toBeDisabled();
  await page.reload();
  await page.getByLabel('選取照片').setInputFiles('tests/integration/fixtures/editor-photo.png');
  await page.getByRole('button', { name: '樣板', exact: true }).click();
  await page.getByRole('button', { name: '編輯目前樣板' }).click();
  await page.getByRole('button', { name: /^座標格式與位置/ }).click();
  await expect(page.getByLabel('精度', { exact: true })).toHaveValue('3');
  await page.getByLabel('座標格式', { exact: true }).selectOption('WGS84_DD');
  await expect(page.getByLabel('座標換行', { exact: true })).toHaveValue('nowrap');
  await page.getByLabel('座標換行', { exact: true }).selectOption('auto');
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByRole('button', { name: /^座標格式與位置/ }).click();
  await page.getByLabel('座標格式', { exact: true }).selectOption('WGS84_DD');
  await expect(page.getByLabel('座標換行', { exact: true })).toHaveValue('nowrap');
});
