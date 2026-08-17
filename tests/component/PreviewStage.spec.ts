import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import PreviewStage from '../../src/components/workspace/PreviewStage.svelte';
import { createOverlay } from '../../src/domain/overlays/overlayEditor';

const overlay = createOverlay({
  id: 'title-1',
  photoId: 'photo-1',
  role: 'title',
  content: 'Photo title',
  fontFamily: 'Noto Sans TC',
  fontSize: 0.06,
  textColor: '#ffffff',
  backgroundColor: '#111827',
  x: 0.1,
  y: 0.1,
  width: 0.5,
  height: 0.1,
  order: 0,
});

function renderStage(overrides: Record<string, unknown> = {}) {
  return render(PreviewStage, {
    props: {
      photoUrl: 'data:image/png;base64,',
      photoAlt: 'Preview of test photo',
      overlays: [overlay],
      selectedId: overlay.id,
      ...overrides,
    },
  });
}

describe('preview overlay direct editing', () => {
  it('opens the quick editor after a tap without moving the overlay', async () => {
    const onSelect = vi.fn();
    const onMove = vi.fn();
    renderStage({ onSelect, onMove });

    const overlayButton = screen.getByRole('button', { name: /select and move title overlay/i });
    await fireEvent.pointerDown(overlayButton, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 100,
      clientY: 100,
      isPrimary: true,
    });
    await fireEvent.pointerUp(overlayButton, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 100,
      clientY: 100,
      isPrimary: true,
    });

    expect(onSelect).toHaveBeenCalledWith(overlay.id);
    expect(onMove).not.toHaveBeenCalled();
    expect(screen.getByRole('region', { name: /quick edit selected text/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Text')).toHaveFocus());
  });

  it('moves the overlay directly after the pointer passes the drag threshold', async () => {
    const onMove = vi.fn();
    const { container } = renderStage({ onMove });
    const photo = container.querySelector<HTMLElement>('.photo');
    expect(photo).not.toBeNull();
    vi.spyOn(photo!, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 1000,
      bottom: 500,
      left: 0,
      width: 1000,
      height: 500,
      toJSON: () => ({}),
    });

    const overlayButton = screen.getByRole('button', { name: /select and move title overlay/i });
    await fireEvent.pointerDown(overlayButton, {
      pointerId: 2,
      pointerType: 'mouse',
      button: 0,
      clientX: 100,
      clientY: 100,
      isPrimary: true,
    });
    await fireEvent.pointerMove(overlayButton, {
      pointerId: 2,
      pointerType: 'mouse',
      clientX: 150,
      clientY: 125,
      isPrimary: true,
    });
    await fireEvent.pointerUp(overlayButton, {
      pointerId: 2,
      pointerType: 'mouse',
      button: 0,
      clientX: 150,
      clientY: 125,
      isPrimary: true,
    });

    expect(onMove).toHaveBeenCalledWith(overlay.id, 0.05, 0.05);
    expect(screen.getByLabelText('Text')).not.toHaveFocus();
  });

  it('edits content, colours, and text size from the selected overlay controls', async () => {
    const onUpdate = vi.fn();
    renderStage({ onUpdate });

    await fireEvent.input(screen.getByLabelText('Text'), {
      target: { value: 'Edited title' },
    });
    await fireEvent.input(screen.getByLabelText('Text colour'), {
      target: { value: '#ff0000' },
    });
    await fireEvent.input(screen.getByLabelText('Background'), {
      target: { value: '#0000ff' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Increase text size' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Decrease text size' }));

    expect(onUpdate).toHaveBeenNthCalledWith(1, overlay.id, { content: 'Edited title' });
    expect(onUpdate).toHaveBeenNthCalledWith(2, overlay.id, { textColor: '#ff0000' });
    expect(onUpdate).toHaveBeenNthCalledWith(3, overlay.id, { backgroundColor: '#0000ff' });
    expect(onUpdate).toHaveBeenNthCalledWith(4, overlay.id, { fontSize: 0.07 });
    expect(onUpdate).toHaveBeenNthCalledWith(5, overlay.id, { fontSize: 0.05 });
  });
});
