<script lang="ts">
  import { tick } from 'svelte';
  import { messages } from '../../i18n';

  const t = messages.en;

  export type BatchReviewEntry = Readonly<{
    id: string;
    name: string;
    status: 'Ready' | 'Missing coordinate' | 'Invalid' | 'Omitted' | 'Exported' | 'Failed';
    decision: 'required' | 'omit' | 'withoutCoordinate';
  }>;

  let {
    open = false,
    items,
    onDecision = () => undefined,
    onConfirm = () => undefined,
    onClose = () => undefined,
  }: {
    open?: boolean;
    items: readonly BatchReviewEntry[];
    onDecision?: (id: string, decision: 'omit' | 'withoutCoordinate') => void;
    onConfirm?: () => void;
    onClose?: () => void;
  } = $props();

  let dialog = $state<HTMLDialogElement>();
  const unresolved = $derived(
    items.filter((item) => item.status === 'Missing coordinate' && item.decision === 'required'),
  );

  $effect(() => {
    if (!open) return;
    void tick().then(() => dialog?.querySelector<HTMLElement>('button')?.focus());
  });
</script>

{#if open}
  <div class="backdrop" role="presentation">
    <dialog bind:this={dialog} open aria-labelledby="batch-review-title">
      <h2 id="batch-review-title">{t.reviewBatchExport}</h2>
      <p>{t.batchExportHelp}</p>
      <ul>
        {#each items as item (item.id)}
          <li>
            <span><strong>{item.name}</strong> — {item.status}</span>
            {#if item.status === 'Missing coordinate' && item.decision === 'required'}
              <div class="decisions">
                <button type="button" onclick={() => onDecision(item.id, 'withoutCoordinate')}
                  >{t.exportWithoutCoordinate} {item.name} {t.withoutCoordinateSuffix}</button
                >
                <button type="button" onclick={() => onDecision(item.id, 'omit')}
                  >{t.omitPhoto} {item.name}</button
                >
              </div>
            {:else if item.decision !== 'required'}
              <small
                >{item.decision === 'omit' ? t.explicitlyOmitted : t.coordinateFreeExport}</small
              >
            {/if}
          </li>
        {/each}
      </ul>
      {#if unresolved.length > 0}
        <p role="alert">
          {t.resolveBatchItemsPrefix}
          {unresolved.length}
          {t.resolveBatchItemsSuffix}
        </p>
      {/if}
      <div class="actions">
        <button type="button" onclick={onClose}>{t.cancel}</button>
        <button type="button" class="primary" disabled={unresolved.length > 0} onclick={onConfirm}
          >{t.startSequentialExport}</button
        >
      </div>
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
    width: min(100%, 46rem);
    max-height: calc(100vh - 2rem);
    gap: 1rem;
    padding: 1rem;
    overflow: auto;
    border: 1px solid #60a5fa;
    border-radius: 1rem;
    color: #e2e8f0;
    background: #0f172a;
  }

  h2,
  p,
  ul {
    margin: 0;
  }

  ul {
    display: grid;
    gap: 0.65rem;
    padding: 0;
  }

  li {
    display: grid;
    gap: 0.45rem;
    padding: 0.65rem;
    border: 1px solid #334155;
    border-radius: 0.65rem;
    list-style: none;
  }

  .decisions,
  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.6rem;
  }

  button {
    min-height: 44px;
    padding: 0.55rem 0.75rem;
  }

  .primary {
    color: #0f172a;
    background: #93c5fd;
    font-weight: 700;
  }
</style>
