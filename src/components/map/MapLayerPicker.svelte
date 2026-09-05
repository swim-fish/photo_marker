<script lang="ts">
  import { MAP_LAYERS, type MapLayerId } from '../../infrastructure/map/layers';
  let {
    selected,
    overlay = false,
    onSelect,
    onOverlayChange = () => {},
  }: {
    selected: MapLayerId;
    overlay?: boolean;
    onSelect: (id: MapLayerId) => void;
    onOverlayChange?: (enabled: boolean) => void;
  } = $props();
</script>

<div class="layers" role="group" aria-label="地圖圖層">
  {#each [{ id: 'other', label: '其他' }, { id: 'nlsc', label: '國土測繪中心' }, { id: 'google', label: 'Google' }] as group (group.id)}
    <strong>{group.label}</strong>
    {#each MAP_LAYERS.filter((layer) => layer.group === group.id) as layer (layer.id)}
      <button
        type="button"
        aria-pressed={selected === layer.id}
        onclick={() => onSelect(layer.id as MapLayerId)}>{layer.label}</button
      >
    {/each}
  {/each}
  <label
    ><input
      type="checkbox"
      checked={overlay}
      onchange={(event) => onOverlayChange(event.currentTarget.checked)}
    />Google 路網疊加層</label
  >
</div>

<style>
  .layers {
    display: grid;
    gap: 10px;
    padding: 12px;
    background: white;
    border-radius: 18px;
  }
  button,
  label {
    text-align: left;
    min-height: 50px;
    padding: 12px;
    background: white;
    border: 2px solid var(--pm-color-border);
    border-radius: 14px;
    color: var(--pm-color-ink);
  }
  button[aria-pressed='true'] {
    border-color: var(--pm-color-accent);
    background: var(--pm-color-pale);
  }
  label {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  input {
    width: 20px;
    height: 20px;
  }
</style>
