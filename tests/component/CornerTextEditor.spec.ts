import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import CornerTextEditor from '../../src/components/overlays/CornerTextEditor.svelte';
it('changes only the selected corner and saves defaults explicitly', async () => {
  const value = { 'top-left': 'A', 'top-right': 'B', 'bottom-left': 'C', 'bottom-right': 'D' },
    onChange = vi.fn(),
    onSaveDefaults = vi.fn();
  render(CornerTextEditor, { value, onChange, onSaveDefaults });
  await fireEvent.input(screen.getByLabelText('左上文字'), {
    target: { value: '台灣\n2026-09-05' },
  });
  expect(onChange).toHaveBeenCalledWith({ ...value, 'top-left': '台灣\n2026-09-05' });
  expect(onSaveDefaults).not.toHaveBeenCalled();
  await fireEvent.click(screen.getByRole('button', { name: '儲存為預設文字' }));
  expect(onSaveDefaults).toHaveBeenCalledOnce();
});
