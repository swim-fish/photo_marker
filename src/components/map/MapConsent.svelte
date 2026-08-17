<script lang="ts">
  import { messages } from '../../i18n';

  const t = messages.en;

  let {
    open = false,
    onAccept = () => undefined,
    onDecline = () => undefined,
  }: {
    open?: boolean;
    onAccept?: () => void;
    onDecline?: () => void;
  } = $props();

  let dialog = $state<HTMLDialogElement>();
  let returnFocus: HTMLElement | null = null;

  $effect(() => {
    if (!open) return;
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    queueMicrotask(() => dialog?.querySelector<HTMLElement>('button')?.focus());
    return () => returnFocus?.focus();
  });

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onDecline();
      return;
    }
    if (event.key !== 'Tab' || !dialog) return;
    const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled])'));
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
</script>

{#if open}
  <div class="backdrop" role="presentation">
    <dialog bind:this={dialog} open aria-labelledby="map-consent-title" onkeydown={handleKeydown}>
      <h2 id="map-consent-title">{t.mapDisclosureTitle}</h2>
      <p>{t.mapDisclosureProvider}</p>
      <p>{t.mapDisclosureArea}</p>
      <p>{t.mapDisclosureExcludedData}</p>
      <div class="actions">
        <button type="button" onclick={onDecline}>{t.decline}</button>
        <button type="button" class="primary" onclick={onAccept}>{t.acceptAndOpenMap}</button>
      </div>
    </dialog>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    z-index: 30;
    display: grid;
    inset: 0;
    padding: 1rem;
    background: rgb(2 6 23 / 82%);
    place-items: center;
  }

  dialog {
    display: grid;
    width: min(100%, 38rem);
    gap: 1rem;
    padding: 1.25rem;
    border: 1px solid #60a5fa;
    border-radius: 1rem;
    color: #e2e8f0;
    background: #0f172a;
  }

  h2,
  p {
    margin: 0;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  button {
    min-height: 44px;
    padding: 0.6rem 1rem;
  }

  .primary {
    color: #0f172a;
    background: #93c5fd;
    font-weight: 700;
  }
</style>
