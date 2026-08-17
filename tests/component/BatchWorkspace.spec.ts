import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import BatchResults from '../../src/components/export/BatchResults.svelte';
import BatchReview from '../../src/components/export/BatchReview.svelte';
import BatchSettings from '../../src/components/export/BatchSettings.svelte';
import PhotoNavigator from '../../src/components/workspace/PhotoNavigator.svelte';

const navigationItems = [
  { id: 'ready', name: 'ready.png', status: 'Ready', provenance: 'Capture metadata' },
  { id: 'missing', name: 'missing.png', status: 'Missing coordinate' },
  { id: 'invalid', name: 'invalid.txt', status: 'Invalid', failureCode: 'unsupported-format' },
  { id: 'exported', name: 'exported.png', status: 'Exported' },
  { id: 'failed', name: 'failed.png', status: 'Failed', failureCode: 'save-failed' },
] as const;

describe('batch workspace components', () => {
  it('presents every item with text status and selects an editable photo without color-only cues', async () => {
    const onSelect = vi.fn();
    render(PhotoNavigator, { items: navigationItems, activeItemId: 'ready', onSelect });

    for (const item of navigationItems) {
      expect(screen.getByText(item.name)).toBeInTheDocument();
      expect(screen.getByText(item.status)).toBeInTheDocument();
    }
    expect(screen.getByText('Capture metadata')).toBeInTheDocument();
    await fireEvent.click(
      screen.getByRole('button', { name: /missing\.png.*missing coordinate/i }),
    );
    expect(onSelect).toHaveBeenCalledWith('missing');
    expect(screen.getByText('unsupported-format')).toBeInTheDocument();
    expect(screen.getByText('save-failed')).toBeInTheDocument();
  });

  it('applies shared title, team, and display format through one explicit action', async () => {
    const onApply = vi.fn();
    render(BatchSettings, { onApply });
    await fireEvent.input(screen.getByLabelText('Shared title'), {
      target: { value: 'Inspection' },
    });
    await fireEvent.input(screen.getByLabelText('Shared team'), { target: { value: 'Team A' } });
    await fireEvent.change(screen.getByLabelText('Shared coordinate format'), {
      target: { value: 'WGS84_DMS' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Apply to all photos' }));
    expect(onApply).toHaveBeenCalledWith({
      title: 'Inspection',
      team: 'Team A',
      displayFormat: 'WGS84_DMS',
    });
  });

  it('blocks confirmation until every missing coordinate has an explicit decision', async () => {
    const onDecision = vi.fn();
    const onConfirm = vi.fn();
    const view = render(BatchReview, {
      open: true,
      items: [
        { id: 'ready', name: 'ready.png', status: 'Ready', decision: 'required' },
        { id: 'missing', name: 'missing.png', status: 'Missing coordinate', decision: 'required' },
        { id: 'invalid', name: 'invalid.txt', status: 'Invalid', decision: 'required' },
      ],
      onDecision,
      onConfirm,
    });
    const confirm = screen.getByRole('button', { name: 'Start sequential export' });
    expect(confirm).toBeDisabled();
    await waitFor(() =>
      expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true),
    );

    await fireEvent.click(
      screen.getByRole('button', { name: 'Export missing.png without coordinate' }),
    );
    expect(onDecision).toHaveBeenCalledWith('missing', 'withoutCoordinate');

    await view.rerender({
      open: true,
      items: [
        { id: 'ready', name: 'ready.png', status: 'Ready', decision: 'required' },
        {
          id: 'missing',
          name: 'missing.png',
          status: 'Ready',
          decision: 'withoutCoordinate',
        },
        { id: 'invalid', name: 'invalid.txt', status: 'Invalid', decision: 'required' },
      ],
      onDecision,
      onConfirm,
    });
    expect(screen.getByRole('button', { name: 'Start sequential export' })).toBeEnabled();
  });

  it('retains mixed results and retries failed items only', async () => {
    const onRetry = vi.fn();
    render(BatchResults, {
      items: [
        { id: 'one', name: 'one.png', status: 'Exported', outputName: 'one-annotated.png' },
        { id: 'omitted', name: 'omitted.png', status: 'Omitted' },
        { id: 'bad', name: 'bad.png', status: 'Failed', failureCode: 'save-failed' },
      ],
      onRetry,
    });
    expect(screen.getByText('one-annotated.png')).toBeInTheDocument();
    expect(screen.getByText('Omitted')).toBeInTheDocument();
    expect(screen.getByText('save-failed')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Retry failed items' }));
    expect(onRetry).toHaveBeenCalledWith(['bad']);
  });
});
