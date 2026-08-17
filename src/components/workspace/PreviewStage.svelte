<script lang="ts">
  import { onDestroy, onMount } from 'svelte';

  import { messages } from '../../i18n';
  import type { TextOverlay } from '../../domain/overlays/types';

  const t = messages.en;

  let {
    photoUrl,
    photoAlt,
    overlays = [],
    selectedId = null,
    onSelect = () => undefined,
    onMove = () => undefined,
  }: {
    photoUrl: string;
    photoAlt: string;
    overlays?: readonly TextOverlay[];
    selectedId?: string | null;
    onSelect?: (overlayId: string) => void;
    onMove?: (overlayId: string, dx: number, dy: number) => void;
  } = $props();

  let zoom = $state(1);
  let photoElement = $state<HTMLDivElement>();
  let photoWidth = $state(1);
  let photoHeight = $state(1);
  let sizeObserver: ResizeObserver | undefined;

  onMount(() => {
    if (!photoElement || typeof ResizeObserver === 'undefined') return;
    sizeObserver = new ResizeObserver(([entry]) => {
      if (!entry) return;
      photoWidth = Math.max(1, entry.contentRect.width);
      photoHeight = Math.max(1, entry.contentRect.height);
    });
    sizeObserver.observe(photoElement);
  });
  onDestroy(() => sizeObserver?.disconnect());

  function handleKey(event: KeyboardEvent, overlayId: string): void {
    const step = event.shiftKey ? 0.05 : 0.01;
    const deltas: Record<string, readonly [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    onMove(overlayId, delta[0], delta[1]);
  }
</script>

<section class="stage-shell" aria-labelledby="preview-title">
  <div class="stage-heading">
    <h2 id="preview-title">{t.previewTitle}</h2>
    <div class="zoom" aria-label={t.previewZoomControls}>
      <button
        type="button"
        aria-label={t.zoomOut}
        onclick={() => (zoom = Math.max(0.5, zoom - 0.25))}>−</button
      >
      <output aria-live="polite">{Math.round(zoom * 100)}%</output>
      <button type="button" aria-label={t.zoomIn} onclick={() => (zoom = Math.min(3, zoom + 0.25))}
        >+</button
      >
      <button type="button" onclick={() => (zoom = 1)}>{t.reset}</button>
    </div>
  </div>
  <div class="viewport">
    <div bind:this={photoElement} class="photo" style:transform={`scale(${zoom})`}>
      <img src={photoUrl} alt={photoAlt} />
      {#each overlays as overlay (overlay.id)}
        <button
          type="button"
          class="overlay"
          class:selected={overlay.id === selectedId}
          style:left={`${overlay.x * 100}%`}
          style:top={`${overlay.y * 100}%`}
          style:width={`${overlay.width * 100}%`}
          style:height={`${overlay.height * 100}%`}
          aria-label={`${t.selectAndMoveOverlay} ${overlay.role} ${t.overlayWord}`}
          onclick={() => onSelect(overlay.id)}
          onkeydown={(event) => handleKey(event, overlay.id)}
        >
          <span
            class="overlay-content"
            style:color={typeof overlay.textColor === 'string' ? overlay.textColor : undefined}
            style:background={typeof overlay.backgroundColor === 'string'
              ? overlay.backgroundColor
              : undefined}
            style:font-family={`"${overlay.fontFamily}", sans-serif`}
            style:font-size={`${overlay.fontSize * photoHeight}px`}
            style:line-height={overlay.lineHeight}
            style:padding={`${overlay.padding * Math.min(photoWidth, photoHeight)}px`}
            >{overlay.content}</span
          >
        </button>
      {/each}
    </div>
  </div>
</section>

<style>
  .stage-shell {
    display: grid;
    min-width: 0;
    gap: 0.75rem;
  }

  .stage-heading,
  .zoom {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  .stage-heading {
    justify-content: space-between;
  }

  h2 {
    margin: 0;
  }

  button {
    min-width: 44px;
    min-height: 44px;
  }

  .viewport {
    overflow: auto;
    min-height: 18rem;
    padding: 1rem;
    border: 1px solid #334155;
    border-radius: 1rem;
    background: #020617;
  }

  .photo {
    position: relative;
    width: 100%;
    max-width: 50rem;
    margin: auto;
    transform-origin: top left;
  }

  img {
    display: block;
    width: 100%;
    height: auto;
    max-width: 100%;
    max-height: 65vh;
    object-fit: contain;
  }

  .overlay {
    position: absolute;
    min-width: 1px;
    min-height: 1px;
    padding: 0;
    border: 2px solid transparent;
    background: transparent;
    touch-action: auto;
  }

  .overlay::before {
    position: absolute;
    width: max(100%, 44px);
    height: max(100%, 44px);
    content: '';
    inset: 50% auto auto 50%;
    transform: translate(-50%, -50%);
  }

  .overlay-content {
    position: absolute;
    overflow: hidden;
    box-sizing: border-box;
    display: block;
    inset: 0;
    text-align: left;
    white-space: pre-wrap;
  }

  .overlay.selected {
    border-color: #fbbf24;
    outline: 2px solid #0f172a;
  }
</style>
