<script lang="ts">
  import { messages } from '../../i18n';

  const t = messages.en;

  export type NavigatorStatus =
    'Ready' | 'Missing coordinate' | 'Invalid' | 'Omitted' | 'Exported' | 'Failed';

  let {
    id,
    name,
    status,
    provenance,
    failureCode,
    active = false,
    onSelect = () => undefined,
    onRemove = () => undefined,
  }: {
    id: string;
    name: string;
    status: NavigatorStatus;
    provenance?: string;
    failureCode?: string;
    active?: boolean;
    onSelect?: (id: string) => void;
    onRemove?: (id: string) => void;
  } = $props();

  const symbol = $derived(
    status === 'Ready'
      ? '✓'
      : status === 'Missing coordinate'
        ? '!'
        : status === 'Exported'
          ? '↧'
          : status === 'Omitted'
            ? '—'
            : '×',
  );
</script>

<li>
  <button
    type="button"
    class:active
    disabled={status === 'Invalid'}
    aria-current={active ? 'true' : undefined}
    aria-label={`${name}: ${status}`}
    onclick={() => onSelect(id)}
  >
    <span class="symbol" aria-hidden="true">{symbol}</span>
    <span class="content">
      <strong>{name}</strong>
      <span>{status}</span>
      {#if provenance}<small>{provenance}</small>{/if}
      {#if failureCode}<small class="failure">{failureCode}</small>{/if}
    </span>
  </button>
  {#if status === 'Invalid'}
    <button
      type="button"
      class="remove"
      aria-label={`${t.removeInvalidPhoto}: ${name}`}
      onclick={() => onRemove(id)}>{t.removeInvalidPhoto}</button
    >
  {/if}
</li>

<style>
  li {
    display: grid;
    min-width: 0;
    gap: 0.35rem;
    list-style: none;
  }

  button {
    display: grid;
    width: 100%;
    min-height: 52px;
    grid-template-columns: 1.6rem minmax(0, 1fr);
    gap: 0.65rem;
    padding: 0.65rem;
    border: 1px solid #475569;
    border-radius: 0.75rem;
    color: #e2e8f0;
    background: #0f172a;
    text-align: left;
  }

  button.active {
    border-color: #93c5fd;
    box-shadow: 0 0 0 2px rgb(147 197 253 / 30%);
  }

  button:disabled {
    opacity: 0.8;
    cursor: not-allowed;
  }

  .remove {
    display: block;
    min-height: 44px;
    color: #fecaca;
    background: #450a0a;
  }

  .symbol {
    display: grid;
    width: 1.5rem;
    height: 1.5rem;
    border: 1px solid currentcolor;
    border-radius: 999px;
    place-items: center;
    font-weight: 800;
  }

  .content {
    display: grid;
    min-width: 0;
    gap: 0.15rem;
  }

  strong,
  small {
    overflow-wrap: anywhere;
  }

  small {
    color: #cbd5e1;
  }

  .failure {
    color: #fecaca;
  }
</style>
