<script lang="ts">
  import type { OverlayCorner } from '../../domain/overlays/types';
  let {
    photoUrl = '',
    value,
    onChange,
  }: {
    photoUrl?: string;
    value: OverlayCorner;
    onChange: (corner: OverlayCorner) => void;
  } = $props();
  const corners = [
    { id: 'top-left', label: '左上' },
    { id: 'top-right', label: '右上' },
    { id: 'bottom-left', label: '左下' },
    { id: 'bottom-right', label: '右下' },
  ] as const;
</script>

<div class="placement" role="group" aria-label="座標位置">
  {#if photoUrl}<img src={photoUrl} alt="" />{/if}
  {#each corners as corner (corner.id)}<button
      aria-label={corner.label}
      aria-pressed={value === corner.id}
      onclick={() => onChange(corner.id)}>{value === corner.id ? '✓ ' : ''}{corner.label}</button
    >{/each}
</div>

<style>
  .placement {
    position: relative;
    isolation: isolate;
    min-height: 170px;
    border-radius: 18px;
    overflow: hidden;
    padding: 12px;
    display: grid;
    grid-template-columns: 94px 94px;
    justify-content: space-between;
    align-content: space-between;
    gap: 24px;
    background: var(--pm-color-pale);
  }
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: -1;
  }
  button {
    min-height: 50px;
    border: 0;
    border-radius: 14px;
    background: white;
    color: var(--pm-color-ink);
    font-size: 15px;
    font-weight: 500;
  }
  button[aria-pressed='true'] {
    background: var(--pm-color-accent);
    color: white;
  }
</style>
