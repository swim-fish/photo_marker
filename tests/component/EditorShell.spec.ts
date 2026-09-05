import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import EditorShell from '../../src/components/workspace/EditorShell.svelte';
describe('focused editor shell', () => {
  it('exposes a localized title and no artificial phone status bar', () => {
    render(EditorShell, { title: '編輯照片', subtitle: '保存在此裝置' });
    expect(screen.getByRole('heading', { name: '編輯照片' })).toBeVisible();
    expect(screen.queryByText('9:41')).not.toBeInTheDocument();
  });
});
