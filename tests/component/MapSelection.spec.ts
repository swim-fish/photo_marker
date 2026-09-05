vi.mock('../../src/infrastructure/map/networkLease', () => ({
  setMapNetworkLease: vi.fn(async () => true),
}));
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import MapPreview from '../../src/components/map/MapPreview.svelte';
import type { Emap5PreviewOptions } from '../../src/infrastructure/map/emap5';
describe('map selection confirmation', () => {
  it('requires consent before mounting a map', () => {
    const createPreview = vi.fn();
    render(MapPreview, {
      center: { latitude: 25, longitude: 121 },
      consented: false,
      createPreview,
    });
    expect(createPreview).not.toHaveBeenCalled();
  });
  it('confirms only settled center and tears down on cancellation', async () => {
    let callbacks: Emap5PreviewOptions = {};
    const destroy = vi.fn(),
      onConfirm = vi.fn();
    const createPreview = vi.fn(async (_host, _center, options) => {
      callbacks = options;
      return { destroy };
    });
    render(MapPreview, {
      center: { latitude: 25, longitude: 121 },
      consented: true,
      createPreview,
      onConfirm,
    });
    await waitFor(() => expect(createPreview).toHaveBeenCalledOnce());
    callbacks.onMoving?.();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '使用準星位置' })).toBeDisabled(),
    );
    callbacks.onTileLoad?.();
    callbacks.onCenterChanged?.({ latitude: 24, longitude: 120 });
    await fireEvent.click(screen.getByRole('button', { name: '使用準星位置' }));
    expect(onConfirm).toHaveBeenCalledWith({ latitude: 24, longitude: 120 });
    expect(destroy).toHaveBeenCalledOnce();
  });
});
