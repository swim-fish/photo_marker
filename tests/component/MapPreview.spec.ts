vi.mock('../../src/infrastructure/map/networkLease', () => ({
  setMapNetworkLease: vi.fn(async () => true),
}));
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import MapConsent from '../../src/components/map/MapConsent.svelte';
import MapPreview from '../../src/components/map/MapPreview.svelte';
import type { Wgs84Coordinate } from '../../src/domain/coordinates/types';
import type { CreateEmap5Preview, Emap5PreviewHandle } from '../../src/infrastructure/map/emap5';

const center: Wgs84Coordinate = Object.freeze({ latitude: 25.033, longitude: 121.5654 });

describe('online map disclosure', () => {
  it('names the provider and reveals no tile before explicit acceptance', async () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    render(MapConsent, { open: true, onAccept, onDecline });

    expect(screen.getByRole('dialog', { name: '地圖連線說明' })).toHaveTextContent(
      /National Land Surveying and Mapping Center|NLSC/i,
    );
    expect(screen.getByRole('dialog')).toHaveTextContent(/瀏覽區域/);
    expect(screen.getByRole('dialog')).toHaveTextContent(/照片.*文字.*草稿/);
    expect(onAccept).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByRole('button', { name: '暫不使用' }));
    expect(onDecline).toHaveBeenCalledOnce();
    expect(onAccept).not.toHaveBeenCalled();
  });
});

describe('contained EMAP5 preview', () => {
  it('does not initialize the provider while offline', () => {
    const createPreview = vi.fn();
    render(MapPreview, { center, online: false, createPreview });

    expect(screen.getByRole('heading', { name: '地圖無法使用' })).toBeInTheDocument();
    expect(createPreview).not.toHaveBeenCalled();
  });

  it('shows online attribution, passes a coordinate copy, and tears down on close', async () => {
    const destroy = vi.fn();
    const onClose = vi.fn();
    const createPreview = vi.fn<CreateEmap5Preview>(
      async (_host, _center, options): Promise<Emap5PreviewHandle> => {
        options?.onTileLoad?.();
        return { destroy };
      },
    );
    render(MapPreview, { center, consented: true, online: true, createPreview, onClose });

    await waitFor(() => expect(createPreview).toHaveBeenCalledOnce());
    const passedCenter = createPreview.mock.calls[0][1];
    expect(passedCenter).toEqual(center);
    expect(passedCenter).not.toBe(center);
    expect(screen.getByText('線上地圖')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /圖資來源：內政部國土測繪中心/ })).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: '取消選取' }));
    expect(destroy).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
    expect(center).toEqual({ latitude: 25.033, longitude: 121.5654 });
  });

  it('isolates provider errors and revocation from the accepted coordinate', async () => {
    const destroy = vi.fn();
    const onRevoke = vi.fn();
    let reportTileError: (() => void) | undefined;
    const createPreview = vi.fn<CreateEmap5Preview>(
      async (_container, _center, options): Promise<Emap5PreviewHandle> => {
        reportTileError = options?.onTileError;
        return { destroy };
      },
    );
    render(MapPreview, { center, consented: true, online: true, createPreview, onRevoke });
    await waitFor(() => expect(createPreview).toHaveBeenCalledOnce());

    reportTileError?.();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('圖層無法載入'));
    expect(center).toEqual({ latitude: 25.033, longitude: 121.5654 });

    await fireEvent.click(screen.getByRole('button', { name: '撤銷地圖同意' }));
    expect(destroy).toHaveBeenCalledOnce();
    expect(onRevoke).toHaveBeenCalledOnce();
  });
});
