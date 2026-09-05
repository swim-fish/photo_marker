import { fireEvent, render, screen } from '@testing-library/svelte';
import { it, expect, vi } from 'vitest';
import MapLayerPicker from '../../src/components/map/MapLayerPicker.svelte';
it('keeps overlay selection independent from the six basemaps', async () => {
  const onSelect = vi.fn(),
    onOverlayChange = vi.fn();
  render(MapLayerPicker, { selected: 'osm-standard', overlay: true, onSelect, onOverlayChange });
  expect(screen.getAllByRole('button')).toHaveLength(6);
  await fireEvent.click(screen.getByRole('button', { name: 'Google 衛星' }));
  expect(onSelect).toHaveBeenCalledWith('google-satellite');
  expect(screen.getByRole('checkbox')).toBeChecked();
  expect(onOverlayChange).not.toHaveBeenCalled();
  await fireEvent.click(screen.getByRole('checkbox'));
  expect(onOverlayChange).toHaveBeenCalledWith(false);
  expect(onSelect).toHaveBeenCalledTimes(1);
});
