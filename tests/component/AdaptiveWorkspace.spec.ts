import { render, screen } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';

import DraftStatus from '../../src/components/workspace/DraftStatus.svelte';
import OfflineStatus from '../../src/components/workspace/OfflineStatus.svelte';

describe('persistent adaptive status', () => {
  test('never claims offline readiness before the complete handshake', () => {
    const view = render(OfflineStatus, {
      readiness: { status: 'not-ready', reason: 'shell-incomplete' },
      online: false,
    });
    expect(screen.getByRole('status')).toHaveTextContent(/offline use is not ready/i);
    expect(screen.getByRole('status')).toHaveTextContent(/application shell/i);

    view.rerender({ readiness: { status: 'ready', workerVersion: 'build-a' }, online: false });
    expect(screen.getByRole('status')).toHaveTextContent(/offline ready/i);
    expect(screen.getByRole('status')).toHaveTextContent(/working offline/i);
  });

  test('distinguishes saving, saved, persistence denial, quota, and failure states', () => {
    const view = render(DraftStatus, { status: 'saving' });
    expect(screen.getByRole('status')).toHaveTextContent('Saving…');
    view.rerender({ status: 'saved' });
    expect(screen.getByRole('status')).toHaveTextContent(/saved locally/i);
    view.rerender({ status: 'denied' });
    expect(screen.getByRole('status')).toHaveTextContent(/best-effort/i);
    view.rerender({ status: 'quotaExceeded' });
    expect(screen.getByRole('alert')).toHaveTextContent(/storage is full/i);
    view.rerender({ status: 'error' });
    expect(screen.getByRole('alert')).toHaveTextContent(/could not save/i);
  });
});
