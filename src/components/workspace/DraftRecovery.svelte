<script lang="ts">
  import { messages } from '../../i18n';

  const t = messages.en;
  let {
    open = false,
    sourceName,
    onClose = () => undefined,
    onResume = () => undefined,
    onDiscard = () => undefined,
  }: {
    open?: boolean;
    sourceName: string;
    onClose?: () => void;
    onResume?: () => void;
    onDiscard?: () => void;
  } = $props();

  let dialog = $state<HTMLDialogElement>();
  let confirmingDiscard = $state(false);
  let returnFocus: HTMLElement | null = null;

  $effect(() => {
    if (!open) return;
    confirmingDiscard = false;
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    queueMicrotask(() => dialog?.querySelector<HTMLElement>('button')?.focus());
    return () => returnFocus?.focus();
  });

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
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
    <dialog
      bind:this={dialog}
      open
      aria-labelledby="draft-recovery-title"
      onkeydown={handleKeydown}
    >
      <h2 id="draft-recovery-title">{t.resumeLocalDraft}</h2>
      <p>{t.draftFoundPrefix} <strong>{sourceName}</strong>.</p>
      <p>{t.draftRecoveryLimit}</p>
      {#if confirmingDiscard}
        <p class="warning">{t.confirmDiscardWarning}</p>
        <div class="actions">
          <button type="button" onclick={() => (confirmingDiscard = false)}
            >{t.cancelDiscard}</button
          >
          <button type="button" class="danger" onclick={onDiscard}>{t.confirmDiscard}</button>
        </div>
      {:else}
        <div class="actions">
          <button type="button" class="primary" onclick={onResume}>{t.resumeDraft}</button>
          <button type="button" onclick={() => (confirmingDiscard = true)}>{t.discardDraft}</button>
          <button type="button" onclick={onClose}>{t.later}</button>
        </div>
      {/if}
    </dialog>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    z-index: 35;
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

  .danger {
    color: #fff1f2;
    background: #9f1239;
  }

  .warning {
    color: #fecdd3;
  }
</style>
