<script lang="ts">
  import type { AnnotationTemplate } from '../../domain/templates/types';
  import { rgbaString } from '../../domain/overlays/color';
  import Button from '../ui/Button.svelte';
  let {
    photoUrl = '',
    onApply,
    templates,
    selected,
    defaultId,
    onSelect,
    onDefault,
    onEdit,
    onNew,
  }: {
    photoUrl?: string;
    onApply?: () => void;
    templates: readonly AnnotationTemplate[];
    selected: AnnotationTemplate;
    defaultId?: string;
    onSelect: (value: AnnotationTemplate) => void;
    onDefault: (id: string) => Promise<void>;
    onEdit: () => void;
    onNew: () => void;
  } = $props();
  let busy = $state(false);
</script>

<div class="selected-template">
  <strong>✓ {selected.name}</strong><Button
    variant="secondary"
    onclick={onEdit}
    label="編輯目前樣板">編輯</Button
  >
</div>
<section aria-label="樣板清單">
  {#each templates as template (template.id)}
    <button
      class="pick"
      aria-pressed={selected.id === template.id}
      onclick={() => onSelect(template)}
    >
      <div class="thumbnail" aria-hidden="true">
        {#if photoUrl}<img src={photoUrl} alt="" />{/if}
        <span
          class="sample-label"
          data-corner={template.coordinateCorner}
          style:background={rgbaString(template.appearance.backgroundColor)}
          style:color={rgbaString(template.appearance.textColor)}
          >{template.coordinateFormat.split('_')[0]}</span
        >
        {#if template.watermark.enabled}<span
            class="sample-watermark"
            style:opacity={template.watermark.opacity}
            >{template.watermark.kind === 'text' ? template.watermark.text : 'PNG'}</span
          >{/if}
      </div>
      <span class="name">{selected.id === template.id ? '✓ ' : ''}{template.name}</span>
    </button>
  {/each}
</section>
<div class="actions">
  <p>套用樣板預設文字與浮水印，保留照片座標。</p>
  {#if onApply}<Button onclick={onApply} label="套用">套用這個樣板</Button>{/if}
  <Button variant="secondary" onclick={onNew}>＋ 自訂樣板</Button>
  <button
    class="default"
    aria-label={`設為預設：${selected.name}`}
    disabled={busy || defaultId === selected.id}
    onclick={async () => {
      busy = true;
      try {
        await onDefault(selected.id);
      } finally {
        busy = false;
      }
    }}
  >
    {defaultId === selected.id ? '✓ 已設為下次匯入的預設樣板' : '☆ 設為下次匯入的預設樣板'}
  </button>
</div>

<style>
  .selected-template {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }
  .selected-template strong {
    min-width: 0;
    overflow-wrap: anywhere;
    font-size: 17px;
  }
  .selected-template :global(button) {
    min-width: 84px;
  }
  section {
    display: flex;
    gap: 9px;
    overflow-x: auto;
    padding: 0 0 16px;
    margin-top: 13px;
  }
  .pick {
    flex: 0 0 calc((100% - 18px) / 3);
    min-width: 0;
    display: grid;
    align-content: start;
    gap: 8px;
    padding: 8px;
    border: 0;
    border-radius: 16px;
    background: white;
    color: var(--pm-color-ink);
  }
  .pick[aria-pressed='true'] {
    background: var(--pm-color-pale);
  }
  .thumbnail {
    position: relative;
    height: 64px;
    border-radius: 12px;
    overflow: hidden;
    background: var(--pm-color-pale);
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .sample-label {
    position: absolute;
    left: 4px;
    bottom: 4px;
    padding: 2px 3px;
    font-size: 7px;
    border-radius: 3px;
  }
  .sample-label[data-corner='top-left'],
  .sample-label[data-corner='top-right'] {
    top: 4px;
    bottom: auto;
  }
  .sample-label[data-corner='top-right'],
  .sample-label[data-corner='bottom-right'] {
    right: 4px;
    left: auto;
  }
  .sample-watermark {
    position: absolute;
    inset: 24px 4px auto;
    color: white;
    font-size: 8px;
  }
  .name {
    font-size: 12px;
    font-weight: 500;
    line-height: 18px;
    overflow-wrap: anywhere;
  }
  .actions {
    display: grid;
    gap: 12px;
  }
  p {
    margin: 0;
    font-size: 12px;
    line-height: 18px;
    color: var(--pm-color-muted);
  }
  .default {
    min-height: 44px;
    border: 0;
    background: transparent;
    color: var(--pm-color-accent);
    font-size: 13px;
    padding: 8px 0;
  }
</style>
