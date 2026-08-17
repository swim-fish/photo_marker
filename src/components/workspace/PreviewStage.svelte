<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';

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
    onUpdate = () => undefined,
  }: {
    photoUrl: string;
    photoAlt: string;
    overlays?: readonly TextOverlay[];
    selectedId?: string | null;
    onSelect?: (overlayId: string) => void;
    onMove?: (overlayId: string, dx: number, dy: number) => void;
    onUpdate?: (overlayId: string, update: Partial<TextOverlay>) => void;
  } = $props();

  type PointerDragState = {
    pointerId: number;
    overlayId: string;
    originX: number;
    originY: number;
    lastX: number;
    lastY: number;
    dragging: boolean;
    captureTarget: HTMLElement;
  };

  const DRAG_THRESHOLD_PX = 4;

  let zoom = $state(1);
  let photoElement = $state<HTMLDivElement>();
  let photoWidth = $state(1);
  let photoHeight = $state(1);
  let quickEditInput = $state<HTMLTextAreaElement>();
  let dragState = $state<PointerDragState | null>(null);
  let sizeObserver: ResizeObserver | undefined;
  const selectedOverlay = $derived(overlays.find((overlay) => overlay.id === selectedId) ?? null);

  onMount(() => {
    if (!photoElement || typeof ResizeObserver === 'undefined') return;
    sizeObserver = new ResizeObserver(([entry]) => {
      if (!entry) return;
      photoWidth = Math.max(1, entry.contentRect.width);
      photoHeight = Math.max(1, entry.contentRect.height);
    });
    sizeObserver.observe(photoElement);
  });
  onDestroy(() => {
    sizeObserver?.disconnect();
    stopPointerTracking();
  });

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

  async function focusQuickEditor(): Promise<void> {
    await tick();
    quickEditInput?.focus();
  }

  function stopPointerTracking(): void {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handleWindowPointerUp);
    window.removeEventListener('pointercancel', handleWindowPointerCancel);
  }

  function handleWindowPointerUp(event: PointerEvent): void {
    void handlePointerEnd(event, true);
  }

  function handleWindowPointerCancel(event: PointerEvent): void {
    void handlePointerEnd(event, false);
  }

  function handlePointerDown(event: PointerEvent, overlayId: string): void {
    if (
      event.isPrimary === false ||
      event.button !== 0 ||
      !(event.currentTarget instanceof HTMLElement)
    )
      return;
    stopPointerTracking();
    onSelect(overlayId);
    dragState = {
      pointerId: event.pointerId,
      overlayId,
      originX: event.clientX,
      originY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      dragging: false,
      captureTarget: event.currentTarget,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerCancel);
  }

  function handlePointerMove(event: PointerEvent): void {
    if (!dragState || event.pointerId !== dragState.pointerId || !photoElement) return;
    const distance = Math.hypot(
      event.clientX - dragState.originX,
      event.clientY - dragState.originY,
    );
    if (!dragState.dragging && distance < DRAG_THRESHOLD_PX) return;
    const bounds = photoElement.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    event.preventDefault();
    onMove(
      dragState.overlayId,
      (event.clientX - dragState.lastX) / bounds.width,
      (event.clientY - dragState.lastY) / bounds.height,
    );
    dragState = {
      ...dragState,
      lastX: event.clientX,
      lastY: event.clientY,
      dragging: true,
    };
  }

  async function handlePointerEnd(event: PointerEvent, editAfterTap: boolean): Promise<void> {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const dragged = dragState.dragging;
    const target = dragState.captureTarget;
    dragState = null;
    stopPointerTracking();
    if (target.hasPointerCapture?.(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
    if (editAfterTap && !dragged) await focusQuickEditor();
  }

  function handleOverlayClick(event: MouseEvent, overlayId: string): void {
    onSelect(overlayId);
    if (event.detail === 0) void focusQuickEditor();
  }

  function adjustTextSize(overlay: TextOverlay, delta: number): void {
    const fontSize = Math.min(
      0.25,
      Math.max(0.01, Math.round((overlay.fontSize + delta) * 100) / 100),
    );
    onUpdate(overlay.id, { fontSize });
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
          class:dragging={dragState?.overlayId === overlay.id && dragState.dragging}
          style:left={`${overlay.x * 100}%`}
          style:top={`${overlay.y * 100}%`}
          style:width={`${overlay.width * 100}%`}
          style:height={`${overlay.height * 100}%`}
          aria-label={`${t.selectAndMoveOverlay} ${overlay.role} ${t.overlayWord}`}
          aria-pressed={overlay.id === selectedId}
          onpointerdown={(event) => handlePointerDown(event, overlay.id)}
          onclick={(event) => handleOverlayClick(event, overlay.id)}
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
  {#if selectedOverlay}
    <section class="quick-editor" aria-labelledby="quick-editor-title">
      <div class="quick-editor-heading">
        <div>
          <h3 id="quick-editor-title">{t.quickEditSelectedText}</h3>
          <p>{t.dragOrEditOverlayHelp}</p>
        </div>
        <output aria-label={t.textSize}>{Math.round(selectedOverlay.fontSize * 100)}%</output>
      </div>
      <label class="text-field">
        {t.quickEditText}
        <textarea
          bind:this={quickEditInput}
          value={selectedOverlay.content}
          oninput={(event) => onUpdate(selectedOverlay.id, { content: event.currentTarget.value })}
        ></textarea>
      </label>
      <div class="quick-controls">
        <label class="color-control">
          {t.textColour}
          <input
            type="color"
            value={typeof selectedOverlay.textColor === 'string'
              ? selectedOverlay.textColor.slice(0, 7)
              : '#ffffff'}
            oninput={(event) =>
              onUpdate(selectedOverlay.id, { textColor: event.currentTarget.value })}
          />
        </label>
        <label class="color-control">
          {t.background}
          <input
            type="color"
            value={typeof selectedOverlay.backgroundColor === 'string'
              ? selectedOverlay.backgroundColor.slice(0, 7)
              : '#111827'}
            oninput={(event) =>
              onUpdate(selectedOverlay.id, { backgroundColor: event.currentTarget.value })}
          />
        </label>
        <div class="text-size-controls" role="group" aria-label={t.textSize}>
          <button
            type="button"
            aria-label={t.decreaseTextSize}
            onclick={() => adjustTextSize(selectedOverlay, -0.01)}>A−</button
          >
          <button
            type="button"
            aria-label={t.increaseTextSize}
            onclick={() => adjustTextSize(selectedOverlay, 0.01)}>A+</button
          >
        </div>
      </div>
    </section>
  {/if}
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
    cursor: grab;
    touch-action: none;
    user-select: none;
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

  .overlay.dragging {
    cursor: grabbing;
  }

  .quick-editor {
    display: grid;
    gap: 0.75rem;
    padding: 1rem;
    border: 1px solid #475569;
    border-radius: 1rem;
    background: #0f172a;
  }

  .quick-editor-heading,
  .quick-controls,
  .color-control,
  .text-size-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .quick-editor-heading {
    justify-content: space-between;
  }

  .quick-editor-heading h3,
  .quick-editor-heading p {
    margin: 0;
  }

  .quick-editor-heading p {
    margin-top: 0.25rem;
    color: #cbd5e1;
  }

  .text-field {
    display: grid;
    gap: 0.375rem;
  }

  textarea {
    box-sizing: border-box;
    width: 100%;
    min-height: 4.5rem;
    resize: vertical;
  }

  .quick-controls {
    flex-wrap: wrap;
  }

  .color-control {
    min-height: 44px;
  }

  input[type='color'] {
    width: 44px;
    min-width: 44px;
    height: 44px;
    padding: 0.125rem;
  }

  @media (max-width: 40rem) {
    .quick-editor-heading {
      align-items: flex-start;
    }

    .quick-controls {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .text-size-controls {
      grid-column: 1 / -1;
    }
  }
</style>
