import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import CoordinateFormatSelector from '../../src/components/coordinate/CoordinateFormatSelector.svelte';
import CoordinateInput from '../../src/components/coordinate/CoordinateInput.svelte';

describe('multi-format coordinate input', () => {
  it('accepts zone-auto-resolved TWD97 and surfaces the decision', async () => {
    const onAccepted = vi.fn();
    render(CoordinateInput, { onAccepted });

    await fireEvent.change(screen.getByLabelText('Input format'), {
      target: { value: 'TWD97_TM2' },
    });
    await fireEvent.input(screen.getByLabelText('Easting'), {
      target: { value: '306962.887' },
    });
    await fireEvent.input(screen.getByLabelText('Northing'), {
      target: { value: '2769619.124' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Use manual coordinate' }));

    expect(onAccepted).toHaveBeenCalledWith(
      expect.objectContaining({
        inputFormat: 'TWD97_TM2',
        zone: 121,
        zoneAutoResolved: true,
      }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(/zone 121 was auto-resolved/i);
  });

  it('rejects unsupported Taipower cells without replacing the accepted coordinate', async () => {
    const onAccepted = vi.fn();
    render(CoordinateInput, { onAccepted });

    await fireEvent.change(screen.getByLabelText('Input format'), {
      target: { value: 'TAIPOWER' },
    });
    await fireEvent.input(screen.getByLabelText('Taipower coordinate'), {
      target: { value: 'I0000 AA00' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Use manual coordinate' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/outside supported Taipower coverage/i);
    expect(onAccepted).not.toHaveBeenCalled();
  });
});

describe('coordinate display selection', () => {
  it('changes display format and exposes format-specific precision', async () => {
    const onChange = vi.fn();
    render(CoordinateFormatSelector, {
      format: 'WGS84_DD',
      precision: null,
      onChange,
    });

    await fireEvent.change(screen.getByLabelText('Display format'), {
      target: { value: 'MGRS' },
    });
    expect(onChange).toHaveBeenCalledWith({ format: 'MGRS', precision: 5 });
  });
});
