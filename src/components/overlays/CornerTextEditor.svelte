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
  {#each corners as corner (corner.id)}<label class="pm-field"
      ><span>{corner.label}角</span><textarea
        aria-label={`${corner.label}文字`}
        placeholder="不顯示文字"
        value={value[corner.id]}
        rows="1"
        oninput={(event) => onChange({ ...value, [corner.id]: event.currentTarget.value })}
      ></textarea></label
    >{/each}
</div>
{#if onSaveDefaults}<button class="save" onclick={onSaveDefaults}>儲存為預設文字</button>
  <p>預設文字只套用到之後匯入的照片。</p>{/if}

<style>
  .corner-text {
    display: grid;
    gap: 12px;
  }
  .save {
    min-height: 50px;
    padding: 12px;
    border: 0;
    background: white;
    color: var(--pm-color-ink);
    border-radius: 14px;
  }
  p {
    color: var(--pm-color-muted);
    font-size: 12px;
  }
</style>
