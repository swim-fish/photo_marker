import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import CornerPicker from '../../src/components/overlays/CornerPicker.svelte';
import CoordinateOverlayOptions from '../../src/components/overlays/CoordinateOverlayOptions.svelte';
import StepNavigation from '../../src/components/workspace/StepNavigation.svelte';

describe('app editing steps', () => {
  it('shows one current step and supports previous and next navigation', async () => {
    const onChange = vi.fn();
    render(StepNavigation, { step: 'coordinate', onChange });

    expect(screen.getAllByRole('button', { name: /photo|coordinate|text|export/i })).toHaveLength(
      4,
    );
    expect(screen.getByRole('button', { name: /coordinate/i })).toHaveAttribute(
      'aria-current',
      'step',
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onChange).toHaveBeenNthCalledWith(1, 'photo');
    expect(onChange).toHaveBeenNthCalledWith(2, 'text');
  });

  it('offers all four corners with a clear selected state', async () => {
    const onChange = vi.fn();
    render(CornerPicker, { label: 'Text corner', value: 'top-right', onChange });

    expect(screen.getByRole('button', { name: 'Top right' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Bottom left' }));
    expect(onChange).toHaveBeenCalledWith('bottom-left');
  });

  it('supports single or multiple coordinate formats and corner placement', async () => {
    const onModeChange = vi.fn();
    const onFormatToggle = vi.fn();
    const onCornerChange = vi.fn();
    render(CoordinateOverlayOptions, {
      mode: 'multiple',
      formats: ['WGS84_DD', 'TWD97_TM2'],
      corner: 'bottom-left',
      onModeChange,
      onFormatToggle,
      onCornerChange,
    });

    await fireEvent.click(screen.getByRole('radio', { name: 'Single coordinate' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'MGRS' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Top left' }));
    expect(onModeChange).toHaveBeenCalledWith('single');
    expect(onFormatToggle).toHaveBeenCalledWith('MGRS');
    expect(onCornerChange).toHaveBeenCalledWith('top-left');
  });
});
