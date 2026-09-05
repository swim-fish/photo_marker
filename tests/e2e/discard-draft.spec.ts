import { test, expect } from '@playwright/test';

test('discard cancels safely, removes the active draft, and permits importing the same photo', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('選取照片').setInputFiles('tests/integration/fixtures/editor-photo.png');
  await expect(page.getByText(/已自動儲存草稿/)).toBeVisible();
  await page.getByRole('button', { name: '捨棄草稿', exact: true }).click();
  await page.getByRole('button', { name: '繼續編輯', exact: true }).click();
  await expect(page.getByRole('heading', { name: '編輯照片' })).toBeVisible();
  await page.getByRole('button', { name: '捨棄草稿', exact: true }).click();
  await page.getByRole('button', { name: '確認捨棄', exact: true }).click();
  await expect(page.getByRole('button', { name: '選取手機照片' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '還原草稿' })).toHaveCount(0);
  await page.getByLabel('選取照片').setInputFiles('tests/integration/fixtures/editor-photo.png');
  await expect(page.getByRole('heading', { name: '編輯照片' })).toBeVisible();
});

test('discards a recovered draft from the welcome page', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('選取照片').setInputFiles('tests/integration/fixtures/editor-photo.png');
  await expect(page.getByText(/已自動儲存草稿/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '還原草稿' })).toBeVisible();
  await page.getByRole('button', { name: '捨棄草稿', exact: true }).click();
  await page.getByRole('button', { name: '確認捨棄', exact: true }).click();
  await expect(page.getByRole('button', { name: '還原草稿' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: '還原草稿' })).toHaveCount(0);
});

test('keeps the editor and draft available if deletion fails', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('選取照片').setInputFiles('tests/integration/fixtures/editor-photo.png');
  await expect(page.getByText(/已自動儲存草稿/)).toBeVisible();
  await page.evaluate(() => {
    const remove = IDBObjectStore.prototype.delete;
    IDBObjectStore.prototype.delete = function (key) {
      IDBObjectStore.prototype.delete = remove;
      throw new DOMException(`Cannot remove ${String(key)}`, 'UnknownError');
    };
  });
  await page.getByRole('button', { name: '捨棄草稿', exact: true }).click();
  await page.getByRole('button', { name: '確認捨棄', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('草稿未能刪除，編輯內容仍保留。請重試。');
  await page.getByRole('button', { name: '繼續編輯', exact: true }).click();
  await expect(page.getByRole('heading', { name: '編輯照片' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '還原草稿' })).toBeVisible();
});
