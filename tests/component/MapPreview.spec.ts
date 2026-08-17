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

    expect(screen.getByRole('dialog', { name: /online map disclosure/i })).toHaveTextContent(
      /National Land Surveying and Mapping Center|NLSC/i,
    );
    expect(screen.getByRole('dialog')).toHaveTextContent(/viewed area/i);
    expect(screen.getByRole('dialog')).toHaveTextContent(/photo.*annotation.*draft/i);
    expect(onAccept).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(onDecline).toHaveBeenCalledOnce();
    expect(onAccept).not.toHaveBeenCalled();
  });
});

describe('contained EMAP5 preview', () => {
  it('does not initialize the provider while offline', () => {
    const createPreview = vi.fn();
    render(MapPreview, { center, online: false, createPreview });

    expect(screen.getByRole('heading', { name: 'Map unavailable' })).toBeInTheDocument();
    expect(createPreview).not.toHaveBeenCalled();
  });

  it('shows online attribution, passes a coordinate copy, and tears down on close', async () => {
    const destroy = vi.fn();
    const onClose = vi.fn();
    const createPreview = vi.fn<CreateEmap5Preview>(async (): Promise<Emap5PreviewHandle> => ({
      destroy,
    }));
    render(MapPreview, { center, online: true, createPreview, onClose });

    await waitFor(() => expect(createPreview).toHaveBeenCalledOnce());
    const passedCenter = createPreview.mock.calls[0][1];
    expect(passedCenter).toEqual(center);
    expect(passedCenter).not.toBe(center);
    expect(screen.getByText('Online map')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Data source: National Land Surveying/i }),
    ).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Close map' }));
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
    render(MapPreview, { center, online: true, createPreview, onRevoke });
    await waitFor(() => expect(createPreview).toHaveBeenCalledOnce());

    reportTileError?.();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Map unavailable' })).toBeInTheDocument(),
    );
    expect(center).toEqual({ latitude: 25.033, longitude: 121.5654 });

    await fireEvent.click(screen.getByRole('button', { name: 'Revoke consent' }));
    expect(destroy).toHaveBeenCalledOnce();
    expect(onRevoke).toHaveBeenCalledOnce();
  });
});
