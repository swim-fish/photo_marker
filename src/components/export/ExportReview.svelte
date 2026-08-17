<script lang="ts">
  import { messages } from '../../i18n';
  import type { ExportConfiguration } from '../../domain/export/types';

  const t = messages.en;

  let {
    open = false,
    photoName,
    configuration,
    ready = true,
    reason = '',
    onConfirm = () => undefined,
    onClose = () => undefined,
  }: {
    open?: boolean;
    photoName: string;
    configuration: ExportConfiguration;
    ready?: boolean;
    reason?: string;
    onConfirm?: () => void;
    onClose?: () => void;
  } = $props();

  let dialog = $state<HTMLDialogElement>();
  let invoker: HTMLElement | null = null;
  let wasOpen = false;

  $effect(() => {
    if (open && !wasOpen) {
      invoker = document.activeElement as HTMLElement | null;
      queueMicrotask(() => {
        const firstControl = dialog?.querySelector<HTMLElement>('button:not([disabled])');
        (firstControl ?? dialog)?.focus();
      });
    } else if (!open && wasOpen) {
      queueMicrotask(() => invoker?.focus());
    }
    wasOpen = open;
  });

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'Tab' && dialog) {
      const controls = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea',
        ),
      );
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }
</script>

{#if open}
  <div class="backdrop" role="presentation">
    <dialog
      bind:this={dialog}
      class="dialog"
      open
      aria-modal="true"
      aria-labelledby="export-review-title"
      onkeydown={handleKeydown}
    >
      <h2 id="export-review-title">{t.exportReview}</h2>
      <dl>
        <div>
          <dt>{t.photo}</dt>
          <dd>{photoName}</dd>
        </div>
        <div>
          <dt>{t.status}</dt>
          <dd>{ready ? t.ready : t.needsResolution}</dd>
        </div>
        <div>
          <dt>{t.format}</dt>
          <dd>{configuration.format === 'image/jpeg' ? t.jpeg : t.png}</dd>
        </div>
        <div>
          <dt>{t.dimensions}</dt>
          <dd>{configuration.width} × {configuration.height}</dd>
        </div>
        <div>
          <dt>{t.metadata}</dt>
          <dd>
            {configuration.metadataMode === 'preserveSupported'
              ? t.preserveSupported
              : t.removeSupported}
          </dd>
        </div>
      </dl>
      {#if !ready}
        <p id="export-resolution-reason" class="warning">{reason}</p>
      {/if}
      <div class="actions">
        <button type="button" onclick={onClose}>{t.back}</button>
        <button
          type="button"
          disabled={!ready}
          aria-describedby={!ready ? 'export-resolution-reason' : undefined}
          onclick={onConfirm}>{t.exportAction}</button
        >
      </div>
    </dialog>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    z-index: 20;
    display: grid;
    inset: 0;
    padding: 1rem;
    background: rgb(2 6 23 / 82%);
    place-items: center;
  }

  .dialog {
    display: grid;
    width: min(100%, 34rem);
    max-height: calc(100vh - 2rem);
    overflow: auto;
    gap: 1rem;
    padding: 1.25rem;
    border: 1px solid #60a5fa;
    border-radius: 1rem;
    color: #e2e8f0;
    background: #0f172a;
  }

  h2,
  dl,
  p {
    margin: 0;
  }

  dl,
  dl div {
    display: grid;
    gap: 0.25rem;
  }

  dl {
    gap: 0.75rem;
  }

  dl div {
    grid-template-columns: minmax(7rem, 0.4fr) 1fr;
  }

  dt {
    color: #94a3b8;
  }

  dd {
    margin: 0;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  button {
    min-height: 44px;
    padding: 0.6rem 1rem;
  }

  .warning {
    color: #fbbf24;
  }
</style>
