import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { expect, test } from '../fixtures';

const photoFixture = resolve(process.cwd(), 'tests/integration/fixtures/sample.png');

test('exports 20 valid photos sequentially and retains one explicit invalid result', async ({
  page,
  viewportKind,
}, testInfo) => {
  test.skip(viewportKind !== 'desktop', 'This journey is scoped to the desktop project.');
  const photoBytes = await readFile(photoFixture);
  await page.goto('/');

  const intakeStarted = Date.now();
  await page.locator('input[type="file"]').setInputFiles([
    ...Array.from({ length: 20 }, (_, index) => ({
      name: `batch-${String(index + 1).padStart(2, '0')}.png`,
      mimeType: 'image/png',
      buffer: photoBytes,
    })),
    {
      name: 'batch-invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('deterministic invalid batch item'),
    },
  ]);

  await expect(page.getByText('21 intake results')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('batch-invalid.txt')).toBeVisible();
  await expect(page.getByText('unsupported-format')).toBeVisible();

  await page.getByRole('tab', { name: 'Export settings' }).click();
  await page.getByLabel('Shared title').fill('Batch inspection');
  await page.getByLabel('Shared team').fill('Team A');
  await page.getByRole('button', { name: 'Apply to all photos' }).click();

  await page.getByRole('button', { name: 'Review export' }).click();
  const review = page.getByRole('dialog', { name: 'Review batch export' });
  await expect(review).toBeVisible();
  for (let index = 1; index <= 20; index += 1) {
    const name = `batch-${String(index).padStart(2, '0')}.png`;
    await review.getByRole('button', { name: `Export ${name} without coordinate` }).click();
  }

  const downloads: string[] = [];
  page.on('download', (download) => downloads.push(download.suggestedFilename()));
  await review.getByRole('button', { name: 'Start sequential export' }).click();

  const results = page.getByRole('region', { name: 'Batch results' });
  await expect(results).toBeVisible({ timeout: 30_000 });
  await expect(results.getByText('Exported', { exact: true })).toHaveCount(20);
  await expect(results.getByText('Failed', { exact: true })).toHaveCount(1);
  await expect(results.getByText('unsupported-format')).toBeVisible();
  expect(downloads.length).toBeGreaterThan(0);
  testInfo.annotations.push({
    type: 'batch-baseline',
    description: `${Date.now() - intakeStarted} ms for intake, shared settings, review, and 20 sequential handoffs`,
  });

  await page.reload();
  await expect(page.getByRole('dialog', { name: /resume local draft/i })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Import photos' })).toBeVisible();
});

test('restores a multi-photo draft with copied shared settings', async ({ page, viewportKind }) => {
  test.skip(viewportKind !== 'desktop', 'This journey is scoped to the desktop project.');
  const photoBytes = await readFile(photoFixture);
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles([
    { name: 'restore-one.png', mimeType: 'image/png', buffer: photoBytes },
    { name: 'restore-two.png', mimeType: 'image/png', buffer: photoBytes },
  ]);
  await expect(page.getByText('2 intake results')).toBeVisible();
  await page.getByRole('tab', { name: 'Export settings' }).click();
  await page.getByLabel('Shared title').fill('Restored batch title');
  await page.getByRole('button', { name: 'Apply to all photos' }).click();
  await expect(page.getByText(/Saved locally|Best-effort local draft/i)).toBeVisible();

  await page.reload();
  const recovery = page.getByRole('dialog', { name: /resume local draft/i });
  await expect(recovery).toBeVisible();
  await recovery.getByRole('button', { name: 'Resume draft' }).click();
  await expect(page.getByText('2 intake results')).toBeVisible();
  await expect(page.getByRole('button', { name: /select and move title overlay/i })).toContainText(
    'Restored batch title',
  );
});
