<script lang="ts">
  import { messages } from '../../i18n';
  import type { ExportResult } from '../../domain/export/types';

  const t = messages.en;

  let {
    results,
    onRetry = () => undefined,
  }: {
    results: readonly ExportResult[];
    onRetry?: (photoId: string) => void;
  } = $props();
</script>

<section aria-labelledby="export-results-title">
  <h3 id="export-results-title">{t.exportResults}</h3>
  <p role="status" aria-live="polite">
    {results.filter((result) => result.status === 'handedOff').length}
    {t.of}
    {results.length}
    {t.handedOffSummarySuffix}
  </p>
  <ul>
    {#each results as result (result.photoId)}
      <li>
        <div>
          <strong>{result.outputName ?? result.photoId}</strong>
          <span>{result.status === 'handedOff' ? t.handedOff : result.status}</span>
          {#if result.failureCode}<span class="error">{result.failureCode}</span>{/if}
        </div>
        {#if result.status === 'failed'}
          <button type="button" onclick={() => onRetry(result.photoId)}>{t.retry}</button>
        {/if}
      </li>
    {/each}
  </ul>
</section>

<style>
  section,
  ul {
    display: grid;
    gap: 0.75rem;
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem;
    border: 1px solid #475569;
    border-radius: 0.75rem;
  }

  li div {
    display: grid;
    gap: 0.2rem;
  }

  button {
    min-height: 44px;
  }

  .error {
    color: #fda4af;
  }
</style>
