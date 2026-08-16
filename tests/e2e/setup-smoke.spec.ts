import { expect, test } from './fixtures';

test('exposes the configured responsive project fixture', async ({ viewportKind }) => {
  expect(['mobile', 'desktop']).toContain(viewportKind);
});
