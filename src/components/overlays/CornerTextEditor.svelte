<script lang="ts">
  import type { CornerTexts } from '../../domain/templates/types';
  import type { OverlayCorner } from '../../domain/overlays/types';
  let {
    value,
    onChange,
    onSaveDefaults,
  }: { value: CornerTexts; onChange: (value: CornerTexts) => void; onSaveDefaults?: () => void } =
    $props();
  const corners: { id: OverlayCorner; label: string }[] = [
    { id: 'top-left', label: '左上' },
    { id: 'top-right', label: '右上' },
    { id: 'bottom-left', label: '左下' },
    { id: 'bottom-right', label: '右下' },
  ];
</script>

<div class="corner-text">
  {#each corners as corner (corner.id)}<label
      >{corner.label}文字<textarea
        value={value[corner.id]}
        rows="2"
        oninput={(event) => onChange({ ...value, [corner.id]: event.currentTarget.value })}
      ></textarea></label
    >{/each}
</div>
{#if onSaveDefaults}<button class="save" onclick={onSaveDefaults}>儲存為預設文字</button>
  <p>預設文字只套用到之後匯入的照片。</p>{/if}

<style>
  .corner-text {
    display: grid;
    gap: 16px;
    grid-template-columns: 1fr 1fr;
  }
  label {
    display: grid;
    gap: 8px;
  }
  textarea {
    min-width: 0;
    width: 100%;
    resize: vertical;
    border: 1px solid var(--pm-color-border);
    border-radius: 14px;
    padding: 12px;
    background: white;
    color: var(--pm-color-ink);
  }
  .save {
    min-height: 50px;
    padding: 12px;
    border: 1px solid var(--pm-color-border);
    background: white;
    color: var(--pm-color-ink);
    border-radius: 14px;
  }
  p {
    color: var(--pm-color-muted);
    font-size: 12px;
  }
  @media (max-width: 350px) {
    .corner-text {
      grid-template-columns: 1fr;
    }
  }
</style>
