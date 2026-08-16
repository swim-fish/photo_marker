<script lang="ts">
  import { messages } from '../../i18n';

  const t = messages.en;

  let {
    name,
    status,
    active = false,
    onSelect = () => undefined,
  }: {
    name: string;
    status: 'Ready' | 'Missing coordinate' | 'Invalid' | 'Exported' | 'Failed';
    active?: boolean;
    onSelect?: () => void;
  } = $props();

  const statusLabels: Record<typeof status, string> = {
    Ready: t.statusReady,
    'Missing coordinate': t.statusMissingCoordinate,
    Invalid: t.statusInvalid,
    Exported: t.statusExported,
    Failed: t.statusFailed,
  };
</script>

<button type="button" class:active aria-current={active ? 'true' : undefined} onclick={onSelect}>
  <span class="name">{name}</span>
  <span class="state"><span aria-hidden="true">●</span> {statusLabels[status]}</span>
</button>

<style>
  button {
    display: grid;
    min-height: 44px;
    width: 100%;
    gap: 0.2rem;
    padding: 0.65rem 0.75rem;
    border: 1px solid #475569;
    border-radius: 0.75rem;
    color: #e2e8f0;
    background: #111827;
    cursor: pointer;
    text-align: left;
  }

  button.active {
    border-color: #93c5fd;
    box-shadow: 0 0 0 2px #1d4ed8;
  }

  .name {
    overflow: hidden;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .state {
    color: #cbd5e1;
    font-size: 0.85rem;
  }
</style>
