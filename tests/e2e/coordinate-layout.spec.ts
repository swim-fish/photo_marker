import { test, expect } from '@playwright/test';
import { formatCoordinate } from '../../src/domain/coordinates/formatCoordinate';

for (const width of [320, 390]) {
  test(`complete coordinates and template fields fit a ${width}px screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await page.getByLabel('選取照片').setInputFiles('tests/integration/fixtures/editor-photo.png');
    for (const [id, label] of [
      ['WGS84_DD', 'WGS84'],
      ['TWD97_TM2', 'TWD97'],
      ['MGRS', 'MGRS'],
    ] as const) {
      await page.getByRole('button', { name: '座標', exact: true }).click();
      if (!(await page.getByLabel('緯度', { exact: true }).isVisible()))
        await page.getByRole('button', { name: /^位置來源：/ }).click();
      await page.getByRole('button', { name: label, exact: true }).click();
      await page.getByLabel('緯度', { exact: true }).fill('25.033123');
      await page.getByLabel('經度', { exact: true }).fill('121.565456');
      await page.getByRole('button', { name: '使用輸入的座標' }).click();
      const summary = page.getByLabel('照片座標', { exact: true });
      const formatted = formatCoordinate({ latitude: 25.033123, longitude: 121.565456 }, id, {
        zone: 121,
        precision: 5,
      });
      expect(formatted.ok).toBe(true);
      if (formatted.ok)
        await expect(summary).toHaveText(
          id === 'WGS84_DD' ? '25.033123, 121.565456' : formatted.value.text,
        );
      expect(
        await summary.evaluate(
          (el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `build/coordinate-${label}-${width}-${test.info().project.name}.png`,
        fullPage: true,
        scale: 'css',
      });
    }
    await page.getByRole('button', { name: '座標', exact: true }).click();
    const coordinatePreview = page.getByLabel('座標格式預覽');
    const expected = formatCoordinate({ latitude: 25.033123, longitude: 121.565456 }, 'MGRS', {
      precision: 5,
    });
    expect(expected.ok).toBe(true);
    if (expected.ok) await expect(coordinatePreview).toHaveText(expected.value.text);
    expect(
      await coordinatePreview.evaluate(
        (el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight,
      ),
    ).toBe(true);
    const formatButtons = ['WGS84', 'TWD97', 'MGRS'].map((name) =>
      page.getByRole('button', { name, exact: true }),
    );
    const rows = await Promise.all(
      formatButtons.map(async (button) => (await button.boundingBox())!.y),
    );
    expect(new Set(rows).size).toBe(1);
    await page
      .getByRole('group', { name: '座標位置' })
      .getByRole('button', { name: '右上', exact: true })
      .click();
    await expect(
      page
        .getByRole('group', { name: '座標位置' })
        .getByRole('button', { name: '右上', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: '取消', exact: true }).click();
    await page.getByRole('button', { name: '樣板', exact: true }).click();
    const cards = page.getByRole('region', { name: '樣板清單' }).getByRole('button');
    const first = await cards.nth(0).boundingBox(),
      second = await cards.nth(1).boundingBox();
    expect(first!.y).toBe(second!.y);
    await page.getByRole('button', { name: '編輯目前樣板' }).click();
    await page.getByRole('button', { name: /^四角預設文字/ }).click();
    await expect(page.getByLabel('右下文字', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
