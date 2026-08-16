<script lang="ts">
  import { messages } from '../../i18n';
  import type { TextOverlay } from '../../domain/overlays/types';

  const t = messages.en;

  let {
    overlays,
    selectedId = null,
    onSelect = () => undefined,
    onRemove = () => undefined,
    onReorder = () => undefined,
  }: {
    overlays: readonly TextOverlay[];
    selectedId?: string | null;
    onSelect?: (overlayId: string) => void;
    onRemove?: (overlayId: string) => void;
    onReorder?: (overlayId: string, targetIndex: number) => void;
  } = $props();
</script>

<section aria-labelledby="overlay-list-title">
  <div class="heading">
    <h3 id="overlay-list-title">{t.textOverlayLabel}</h3>
    <span>{overlays.length}</span>
  </div>
  {#if overlays.length === 0}
    <p>{t.noOverlays}</p>
  {:else}
    <ul>
      {#each overlays as overlay, index (overlay.id)}
        <li class:selected={overlay.id === selectedId}>
          <button
            type="button"
            class="select"
            aria-pressed={overlay.id === selectedId}
            onclick={() => onSelect(overlay.id)}
          >
            <strong>{overlay.role}</strong>
            <span>{overlay.content || t.emptyText}</span>
          </button>
          <div
            class="row-actions"
            aria-label={`${t.moveOverlayOrder} ${overlay.role} ${t.overlayWord}`}
          >
            <button
              type="button"
              aria-label={`${t.moveOverlayAction} ${overlay.role} ${t.earlier}`}
              disabled={index === 0}
              onclick={() => onReorder(overlay.id, index - 1)}>↑</button
            >
            <button
              type="button"
              aria-label={`${t.moveOverlayAction} ${overlay.role} ${t.later}`}
              disabled={index === overlays.length - 1}
              onclick={() => onReorder(overlay.id, index + 1)}>↓</button
            >
            <button
              type="button"
              aria-label={`${t.removeOverlay} ${overlay.role} ${t.overlayWord}`}
              onclick={() => onRemove(overlay.id)}>{t.removeOverlay}</button
            >
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  section,
  ul {
    display: grid;
    gap: 0.75rem;
  }

  .heading,
  .row-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  .heading {
    justify-content: space-between;
  }

  h3,
  p,
  ul {
    margin: 0;
  }

  ul {
    padding: 0;
    list-style: none;
  }

  li {
    padding: 0.5rem;
    border: 1px solid #475569;
    border-radius: 0.75rem;
  }

  li.selected {
    border-color: #93c5fd;
  }

  button {
    min-height: 44px;
  }

  .select {
    display: grid;
    width: 100%;
    padding: 0.5rem;
    border: 0;
    color: inherit;
    background: transparent;
    text-align: left;
  }

  .select span {
    overflow: hidden;
    color: #cbd5e1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
