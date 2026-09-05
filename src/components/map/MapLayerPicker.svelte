<script lang="ts">
  import { MAP_LAYERS, type MapLayerId } from '../../infrastructure/map/layers';
  let { selected, onSelect }: { selected: MapLayerId; onSelect: (id: MapLayerId) => void } =
    $props();
</script>

<div class="layers" role="group" aria-label="地圖圖層">
  {#each MAP_LAYERS as layer (layer.id)}<button
      type="button"
      aria-pressed={selected === layer.id}
      onclick={() => onSelect(layer.id)}
      ><strong>{layer.label}</strong><small>{layer.detail}</small></button
    >{/each}
</div>

<style>
  .layers {
    display: grid;
    gap: 10px;
    padding: 12px;
    background: white;
    border-radius: 18px;
  }
  button {
    text-align: left;
    display: grid;
    gap: 4px;
    min-height: 56px;
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
  small {
    color: var(--pm-color-muted);
  }
</style>
