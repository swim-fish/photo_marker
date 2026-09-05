import { test, expect, type Page } from '@playwright/test';
async function templates(page: Page) {
  await page.goto('/');
  await page.getByLabel('選取照片').setInputFiles('tests/integration/fixtures/sample.png');
  await page.getByRole('button', { name: '樣板', exact: true }).click();
}
async function panel(page: Page, name: string) {
  await page.getByRole('button', { name: new RegExp(name) }).click();
}
async function done(page: Page) {
  await page.getByRole('button', { name: '完成，返回樣板' }).click();
}
test('creates, edits and restores template defaults through the right-side editor', async ({
  page,
}) => {
  await templates(page);
  await expect(page.getByLabel('左上文字')).toHaveCount(0);
  await page.getByRole('button', { name: '＋ 自訂樣板' }).click();
  await page.getByLabel('樣板名稱').fill('巡查樣板');
  await panel(page, '四角預設文字');
  for (const [label, value] of [
    ['左上文字', '工程 A'],
    ['右上文字', '巡查員'],
    ['左下文字', '晴天'],
    ['右下文字', '第一期'],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await done(page);
  await panel(page, '^浮水印');
  await page.getByLabel('啟用浮水印').check();
  await page.getByLabel('浮水印文字').fill('內部紀錄');
  await page.getByRole('button', { name: '隨機重複', exact: true }).click();
  await done(page);
  await page.getByRole('button', { name: '儲存目前設定為樣板' }).click();
  await page.getByRole('button', { name: '編輯目前樣板' }).click();
  await panel(page, '四角預設文字');
  await page.getByLabel('右下文字', { exact: true }).fill('第二期');
  await done(page);
  await panel(page, '^浮水印');
  await page.getByLabel('浮水印文字').fill('工程專用');
  await done(page);
  await page.getByRole('button', { name: '儲存變更' }).click();
  await page.getByRole('button', { name: '設為預設：巡查樣板' }).click();
  await expect(page.getByText('已設定新照片預設樣板')).toBeVisible();
  await page.reload();
  await page.getByLabel('選取照片').setInputFiles('tests/integration/fixtures/sample.png');
  await page.getByRole('button', { name: '樣板', exact: true }).click();
  await page.screenshot({
    path: `build/template-list-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: '編輯目前樣板' }).click();
  await page.screenshot({
    path: `build/template-editor-${test.info().project.name}.png`,
    fullPage: true,
  });
  await panel(page, '四角預設文字');
  for (const [label, value] of [
    ['左上文字', '工程 A'],
    ['右上文字', '巡查員'],
    ['左下文字', '晴天'],
    ['右下文字', '第二期'],
  ])
    await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
  await done(page);
  await panel(page, '^浮水印');
  await expect(page.getByLabel('浮水印文字')).toHaveValue('工程專用');
  await expect(page.getByRole('button', { name: '隨機重複', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
test('cancels subsettings and the complete edit without changing stored template', async ({
  page,
}) => {
  await templates(page);
  await page.getByRole('button', { name: '編輯目前樣板' }).click();
  await panel(page, '四角預設文字');
  await page.getByLabel('左上文字', { exact: true }).fill('取消的文字');
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await panel(page, '四角預設文字');
  await expect(page.getByLabel('左上文字', { exact: true })).toHaveValue('');
  await page.getByLabel('左上文字', { exact: true }).fill('尚未儲存');
  await done(page);
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await page.getByRole('button', { name: '編輯目前樣板' }).click();
  await panel(page, '四角預設文字');
  await expect(page.getByLabel('左上文字', { exact: true })).toHaveValue('');
});
test('persists PNG watermark assets when saving the template editor', async ({ page }) => {
  await templates(page);
  await page.getByRole('button', { name: '＋ 自訂樣板' }).click();
  await page.getByLabel('樣板名稱').fill('圖片樣板');
  await panel(page, '^浮水印');
  await page.getByLabel('啟用浮水印').check();
  await page.getByLabel('浮水印類型').selectOption('image');
  await page.getByLabel('選取 PNG 浮水印').setInputFiles('tests/integration/fixtures/sample.png');
  await done(page);
  await page.getByRole('button', { name: '儲存目前設定為樣板' }).click();
  await page.getByRole('button', { name: '設為預設：圖片樣板' }).click();
  await expect(page.getByText('已設定新照片預設樣板')).toBeVisible();
  await page.reload();
  await page.getByLabel('選取照片').setInputFiles('tests/integration/fixtures/sample.png');
  await page.getByRole('button', { name: '樣板', exact: true }).click();
  await page.getByRole('button', { name: '編輯目前樣板' }).click();
  await panel(page, '^浮水印');
  await expect(page.getByLabel('浮水印類型')).toHaveValue('image');
  await expect(page.getByLabel('啟用浮水印')).toBeChecked();
  await done(page);
  await page.getByRole('button', { name: '儲存變更' }).click();
  await page.getByRole('button', { name: '套用', exact: true }).click();
  await expect(page.getByRole('heading', { name: '編輯照片' })).toBeVisible();
});
