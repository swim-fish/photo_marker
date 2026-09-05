import { test, expect } from '@playwright/test';
for (const width of [320, 768, 1280]) {
  test(`new controls fit ${width}px and keyboard activates once`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 720 });
    await page.goto('/');
    await page.getByLabel('選取照片').setInputFiles('tests/integration/fixtures/editor-photo.png');
    await page.getByRole('button', { name: '四角文字', exact: true }).click();
    await page.getByRole('button', { name: '文字樣式與底色' }).click();
    const plus = page.getByRole('button', { name: '增加文字大小' });
    const minus = page.getByRole('button', { name: '減少文字大小' });
    const before = await page.getByLabel('文字大小數值', { exact: true }).inputValue();
    await plus.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('文字大小數值', { exact: true })).toHaveValue(
      String(Number(before) + 1),
    );
    const p = (await plus.boundingBox())!,
      m = (await minus.boundingBox())!;
    expect(p.width).toBeGreaterThanOrEqual(50);
    expect(p.height).toBeGreaterThanOrEqual(50);
    expect(p.x - (m.x + m.width)).toBeGreaterThanOrEqual(24);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByLabel('RGBA 值').focus();
    await expect(page.getByLabel('RGBA 值')).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`rgba-${width}.png`), fullPage: true });
    await page.getByRole('button', { name: '取消', exact: true }).click();
    await expect(page.getByRole('heading', { name: '編輯照片' })).toBeFocused();
  });
}
