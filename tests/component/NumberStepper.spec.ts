import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import NumberStepper from '../../src/components/ui/NumberStepper.svelte';
describe('separated number stepper', () => {
  it('emits exactly one step and disables the lower bound', async () => {
    const onChange = vi.fn();
    render(NumberStepper, { label: '文字大小', value: 8, min: 8, max: 96, onChange });
    expect(screen.getByRole('button', { name: '減少文字大小' })).toBeDisabled();
    await fireEvent.click(screen.getByRole('button', { name: '增加文字大小' }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith(9);
  });
});
