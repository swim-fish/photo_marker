import { fireEvent, render, screen } from '@testing-library/svelte';
import { it, expect, vi } from 'vitest';
import TemplatePicker from '../../src/components/templates/TemplatePicker.svelte';
import { defaultTemplate } from '../../src/domain/templates/types';
it('opens editing from the selected template right-side action without inline content fields', async () => {
  const onEdit = vi.fn();
  render(TemplatePicker, {
    templates: [defaultTemplate],
    selected: defaultTemplate,
    onSelect: vi.fn(),
    onDefault: vi.fn(),
    onEdit,
    onNew: vi.fn(),
  });
  expect(screen.queryByLabelText('左上文字')).not.toBeInTheDocument();
  await fireEvent.click(screen.getByRole('button', { name: '編輯目前樣板' }));
  expect(onEdit).toHaveBeenCalledOnce();
});
