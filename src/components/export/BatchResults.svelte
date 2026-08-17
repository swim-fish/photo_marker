<script lang="ts">
  import { messages } from '../../i18n';

  const t = messages.en;
  export type BatchResultEntry = Readonly<{
    id: string;
    name: string;
    status: 'Exported' | 'Omitted' | 'Failed' | 'Cancelled';
    outputName?: string;
    failureCode?: string;
    retryable?: boolean;
  }>;

  let {
    items,
    onRetry = () => undefined,
  }: {
    items: readonly BatchResultEntry[];
    onRetry?: (ids: string[]) => void;
  } = $props();

  const failedIds = $derived(
    items
      .filter((item) => item.status === 'Failed' && item.retryable !== false)
      .map((item) => item.id),
  );
</script>

<section aria-labelledby="batch-results-title">
  <h2 id="batch-results-title">{t.batchResults}</h2>
  <ul>
    {#each items as item (item.id)}
      <li>
        <strong>{item.name}</strong>
        <span>{item.status}</span>
        {#if item.outputName}<span>{item.outputName}</span>{/if}
        {#if item.failureCode}<span class="failure">{item.failureCode}</span>{/if}
      </li>
    {/each}
  </ul>
  {#if failedIds.length > 0}
    <button type="button" onclick={() => onRetry(failedIds)}>{t.retryFailedItems}</button>
  {/if}
</section>

<style>
  section,
  ul {
    display: grid;
    gap: 0.75rem;
  }

  section {
    padding: 1rem;
    border: 1px solid #334155;
    border-radius: 0.85rem;
    background: #0f172a;
  }

  h2,
  ul {
    margin: 0;
  }

  ul {
    padding: 0;
  }

  li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.35rem 0.75rem;
    padding: 0.65rem;
    border-bottom: 1px solid #334155;
    list-style: none;
  }

  .failure {
    color: #fecaca;
  }

  button {
    width: fit-content;
    min-height: 44px;
    padding: 0.6rem 0.85rem;
  }
</style>
