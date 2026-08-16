<script lang="ts">
  let {
    message,
    kind = 'status',
    busy = false,
  }: {
    message: string;
    kind?: 'status' | 'alert';
    busy?: boolean;
  } = $props();
</script>

{#if kind === 'alert'}
  <div class="status-region error" role="alert">{message}</div>
{:else}
  <div class="status-region" role="status" aria-live="polite" aria-busy={busy}>{message}</div>
{/if}

<style>
  .status-region {
    padding: 0.75rem 1rem;
    border: 1px solid #334155;
    border-radius: 0.75rem;
    color: #dbeafe;
    background: #172033;
  }

  .error {
    border-color: #fb7185;
    color: #ffe4e6;
    background: #4c0519;
  }
</style>
