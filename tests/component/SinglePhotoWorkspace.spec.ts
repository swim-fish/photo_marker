import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import SinglePhotoWorkspace from '../../src/components/workspace/SinglePhotoWorkspace.svelte';

type WorkspaceState = 'empty' | 'loading' | 'error' | 'disabled' | 'ready' | 'success';

function renderWorkspace(state: WorkspaceState, overrides: Record<string, unknown> = {}) {
  return render(SinglePhotoWorkspace, {
    props: {
      state,
      onImport: vi.fn(),
      onCancel: vi.fn(),
      onRetry: vi.fn(),
      onReviewExport: vi.fn(),
      onExport: vi.fn(),
      ...overrides,
    },
  });
}

describe('single-photo workspace states', () => {
  it('shows an actionable empty state with supported formats and local-only wording', () => {
    renderWorkspace('empty');

    expect(screen.getByRole('button', { name: 'Import photos' })).toBeEnabled();
    expect(screen.getByText(/JPEG and PNG/i)).toBeInTheDocument();
    expect(screen.getByText(/local-only|locally/i)).toBeInTheDocument();
  });

  it('exposes loading progress and a keyboard-accessible cancel action', () => {
    const onCancel = vi.fn();
    renderWorkspace('loading', { onCancel });

    expect(screen.getByRole('status')).toHaveTextContent(/import|loading/i);
    const cancel = screen.getByRole('button', { name: /cancel/i });
    expect(cancel).toBeEnabled();
    fireEvent.keyDown(cancel, { key: 'Enter' });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('associates an actionable safe error with retry without exposing a local path', () => {
    const onRetry = vi.fn();
    renderWorkspace('error', {
      onRetry,
      errorCode: 'unsupported-format',
      errorMessage: 'This photo format is not supported.',
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/unsupported|format/i);
    expect(alert.textContent).not.toContain('C:\\');
    expect(alert.textContent).not.toContain('/Users/');
    const retry = screen.getByRole('button', { name: /retry|replace|remove/i });
    fireEvent.keyDown(retry, { key: 'Enter' });
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('keeps Review export disabled with a persistent reason until the photo is resolved', () => {
    renderWorkspace('disabled', {
      disabledReason: 'Resolve the working coordinate before export.',
    });

    const review = screen.getByRole('button', { name: 'Review export' });
    expect(review).toBeDisabled();
    const describedBy = review.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy ?? '')).toHaveTextContent(/coordinate|export/i);
  });

  it('completes the final action from the keyboard and announces browser handoff success', async () => {
    const onReviewExport = vi.fn();
    const onExport = vi.fn();
    renderWorkspace('ready', { onReviewExport, onExport, canExport: true });

    const review = screen.getByRole('button', { name: 'Review export' });
    expect(review).toBeEnabled();
    await fireEvent.keyDown(review, { key: 'Enter' });
    expect(onReviewExport).toHaveBeenCalledOnce();

    const exportButton = screen.getByRole('button', { name: /^Export$/i });
    await fireEvent.keyDown(exportButton, { key: 'Enter' });
    expect(onExport).toHaveBeenCalledOnce();

    renderWorkspace('success', { outputName: 'orientation-6.annotated.jpg' });
    expect(screen.getByRole('status')).toHaveTextContent(/handed to the browser|success/i);
    expect(screen.getByText(/orientation-6\.annotated\.jpg/i)).toBeInTheDocument();
  });
});
