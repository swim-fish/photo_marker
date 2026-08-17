<script lang="ts">
  import { messages } from '../../i18n';
  import type { TextOverlay } from '../../domain/overlays/types';

  const t = messages.en;

  let {
    overlay,
    onUpdate = () => undefined,
    onMove = () => undefined,
    onResize = () => undefined,
    onRemove = () => undefined,
  }: {
    overlay: TextOverlay | null;
    onUpdate?: (update: Partial<TextOverlay>) => void;
    onMove?: (dx: number, dy: number) => void;
    onResize?: (dw: number, dh: number) => void;
    onRemove?: () => void;
  } = $props();

  const numberValue = (event: Event): number =>
    Number((event.currentTarget as HTMLInputElement).value);
</script>

<section aria-labelledby="overlay-inspector-title">
  <h3 id="overlay-inspector-title">{t.overlayInspector}</h3>
  {#if overlay}
    <label>
      {t.content}
      <textarea
        value={overlay.content}
        oninput={(event) => onUpdate({ content: event.currentTarget.value })}></textarea>
    </label>
    <div class="grid">
      <label
        >{t.x}
        <input
          type="number"
          min="0"
          max="1"
          step="0.01"
          value={overlay.x}
          oninput={(event) => onUpdate({ x: numberValue(event) })}
        /></label
      >
      <label
        >{t.y}
        <input
          type="number"
          min="0"
          max="1"
          step="0.01"
          value={overlay.y}
          oninput={(event) => onUpdate({ y: numberValue(event) })}
        /></label
      >
      <label
        >{t.width}
        <input
          type="number"
          min="0.01"
          max="1"
          step="0.01"
          value={overlay.width}
          oninput={(event) => onUpdate({ width: numberValue(event) })}
        /></label
      >
      <label
        >{t.height}
        <input
          type="number"
          min="0.01"
          max="1"
          step="0.01"
          value={overlay.height}
          oninput={(event) => onUpdate({ height: numberValue(event) })}
        /></label
      >
      <label
        >{t.textSize}
        <input
          type="number"
          min="0.01"
          max="0.25"
          step="0.01"
          value={overlay.fontSize}
          oninput={(event) => onUpdate({ fontSize: numberValue(event) })}
        /></label
      >
      <label
        >{t.textColour}
        <input
          type="color"
          value={typeof overlay.textColor === 'string' ? overlay.textColor.slice(0, 7) : '#ffffff'}
          oninput={(event) => onUpdate({ textColor: event.currentTarget.value })}
        /></label
      >
      <label
        >{t.background}
        <input
          type="color"
          value={typeof overlay.backgroundColor === 'string'
            ? overlay.backgroundColor.slice(0, 7)
            : '#111827'}
          oninput={(event) => onUpdate({ backgroundColor: event.currentTarget.value })}
        /></label
      >
    </div>
    <div class="controls" aria-label={t.moveSelectedOverlay}>
      <button type="button" aria-label={t.moveUp} onclick={() => onMove(0, -0.01)}>↑</button>
      <button type="button" aria-label={t.moveDown} onclick={() => onMove(0, 0.01)}>↓</button>
      <button type="button" aria-label={t.moveLeft} onclick={() => onMove(-0.01, 0)}>←</button>
      <button type="button" aria-label={t.moveRight} onclick={() => onMove(0.01, 0)}>→</button>
      <button type="button" onclick={() => onResize(-0.01, -0.01)}>{t.smaller}</button>
      <button type="button" onclick={() => onResize(0.01, 0.01)}>{t.larger}</button>
      <button type="button" class="danger" onclick={onRemove}>{t.removeOverlayAction}</button>
    </div>
    {#if overlay.contrastStatus === 'warning'}
      <p class="warning" role="status">
        {t.lowContrastWarning}
      </p>
    {/if}
  {:else}
    <p>{t.selectOverlayToEdit}</p>
  {/if}
</section>

<style>
  section,
  label {
    display: grid;
    gap: 0.5rem;
  }

  section {
    gap: 1rem;
  }

  h3,
  p {
    margin: 0;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
    gap: 0.75rem;
  }

  input,
  textarea,
  button {
    min-height: 44px;
  }

  button {
    min-width: 44px;
  }

  textarea {
    min-height: 5rem;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .warning {
    color: #fbbf24;
  }

  .danger {
    border-color: #fb7185;
  }
</style>
