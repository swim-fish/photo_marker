import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, test, vi } from 'vitest';

import DraftRecovery from '../../src/components/workspace/DraftRecovery.svelte';
import InstallHelp from '../../src/components/workspace/InstallHelp.svelte';

describe('accessible recovery and install interactions', () => {
  test('moves focus into draft recovery, confirms discard, and returns focus on close', async () => {
    const onClose = vi.fn();
    const onResume = vi.fn();
    const onDiscard = vi.fn();
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();

    const view = render(DraftRecovery, {
      open: true,
      sourceName: 'sample.png',
      onClose,
      onResume,
      onDiscard,
    });
    const dialog = screen.getByRole('dialog', { name: /resume local draft/i });
    expect(dialog).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Resume draft' })).toHaveFocus());

    await fireEvent.click(screen.getByRole('button', { name: 'Discard draft' }));
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm discard' }));
    expect(onDiscard).toHaveBeenCalledOnce();

    view.rerender({ open: false, sourceName: 'sample.png', onClose, onResume, onDiscard });
    await waitFor(() => expect(opener).toHaveFocus());
    opener.remove();
  });

  test('supports Escape and presents install help without claiming automatic installation', async () => {
    const onClose = vi.fn();
    render(DraftRecovery, { open: true, sourceName: 'sample.png', onClose });
    await fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();

    render(InstallHelp, { installed: false });
    expect(screen.getByRole('region', { name: /install photo marker/i })).toHaveTextContent(
      /browser.*install/i,
    );
  });
});
