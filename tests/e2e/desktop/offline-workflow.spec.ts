import { test } from '../fixtures';
import { completeOfflineDraftJourney } from '../offlineJourney';

test('restores and clears a local draft in the offline desktop PWA', async ({
  page,
  context,
  viewportKind,
}) => {
  test.skip(
    viewportKind !== 'desktop' || process.env.RUN_OFFLINE_E2E !== '1',
    'Run explicitly against the production preview for the offline release gate.',
  );
  await completeOfflineDraftJourney(page, context);
});
