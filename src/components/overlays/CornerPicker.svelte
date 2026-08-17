<script lang="ts">
  import type { OverlayCorner } from '../../domain/overlays/types';
  import { messages } from '../../i18n';

  const t = messages.en;

  let {
    label,
    value,
    onChange = () => undefined,
  }: {
    label: string;
    value: OverlayCorner;
    onChange?: (corner: OverlayCorner) => void;
  } = $props();

  const corners: readonly { value: OverlayCorner; label: string; marker: string }[] = [
    { value: 'top-left', label: t.topLeft, marker: '↖' },
    { value: 'top-right', label: t.topRight, marker: '↗' },
    { value: 'bottom-left', label: t.bottomLeft, marker: '↙' },
    { value: 'bottom-right', label: t.bottomRight, marker: '↘' },
  ];
</script>

<fieldset>
  <legend>{label}</legend>
  <div class="corners">
    {#each corners as corner (corner.value)}
      <button
        type="button"
        aria-label={corner.label}
        aria-pressed={value === corner.value}
        onclick={() => onChange(corner.value)}
      >
        <span aria-hidden="true">{corner.marker}</span>
        {corner.label}
      </button>
    {/each}
  </div>
</fieldset>

<style>
  fieldset {
    display: grid;
    gap: 0.5rem;
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }

  legend {
    margin-bottom: 0.5rem;
    font-weight: 700;
  }

  .corners {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }

  button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    min-height: 48px;
    padding: 0.55rem 0.7rem;
    border: 1px solid #64748b;
    border-radius: 0.65rem;
    color: #eff6ff;
    background: #0f172a;
    cursor: pointer;
  }

  button[aria-pressed='true'] {
    border-color: #93c5fd;
    color: #0f172a;
    background: #93c5fd;
    font-weight: 700;
  }
</style>
