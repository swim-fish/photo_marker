import { render, fireEvent, screen } from '@testing-library/svelte';
import { it, expect, vi } from 'vitest';
import RgbaPicker from '../../src/components/ui/RgbaPicker.svelte';
it('does not accept another channel while one is incomplete', async () => {
  const onChange = vi.fn(),
    onValidityChange = vi.fn();
  render(RgbaPicker, {
    value: { red: 24, green: 53, blue: 47, alpha: 0.85 },
    onChange,
    onValidityChange,
  });
  await fireEvent.input(screen.getByLabelText('R', { exact: true }), { target: { value: '' } });
  await fireEvent.input(screen.getByLabelText('G', { exact: true }), { target: { value: '100' } });
  expect(onChange).not.toHaveBeenCalled();
  expect(onValidityChange).toHaveBeenLastCalledWith(false);
  await fireEvent.input(screen.getByLabelText('R', { exact: true }), { target: { value: '24' } });
  expect(onChange).toHaveBeenLastCalledWith({ red: 24, green: 100, blue: 47, alpha: 0.85 });
});
