<script lang="ts">
  import type { AnnotationTemplate } from '../../domain/templates/types';
  import { rgbaString } from '../../domain/overlays/color';
  import Button from '../ui/Button.svelte';
  let {
    templates,
    selected,
    defaultId,
    onSelect,
    onDefault,
    onEdit,
    onNew,
  }: {
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
  <strong>{selected.name}</strong><Button variant="secondary" onclick={onEdit} label="編輯目前樣板"
    >編輯</Button
  >
</div>

<section aria-label="樣板清單">
  {#each templates as template (template.id)}
    <div class="card">
      <button
        class="pick"
        aria-pressed={selected.id === template.id}
        onclick={() => onSelect(template)}
      >
        <div class="thumbnail" aria-hidden="true">
          <span
            class="sample-label"
            data-corner={template.coordinateCorner}
            style:background={rgbaString(template.appearance.backgroundColor)}
            style:color={rgbaString(template.appearance.textColor)}
            style:border-radius={`${template.appearance.cornerRadius * 390}px`}
            >記錄文字 · {template.coordinateFormat.split('_')[0]}</span
          >{#if template.watermark.enabled}<span
              class="sample-watermark"
              style:opacity={template.watermark.opacity}
              >{template.watermark.kind === 'text' ? template.watermark.text : 'PNG'}</span
            >{/if}
        </div>
        <strong>{template.name}</strong><span
          >{template.coordinateFormat.replace('_DD', '').replace('_TM2', '')} · {template.watermark
            .enabled
            ? '含浮水印'
            : '文字與座標'}</span
        >
        {#if defaultId === template.id}<small>新照片預設樣板</small>{/if}
      </button>
      <Button
        variant="secondary"
        disabled={busy || defaultId === template.id}
        onclick={async () => {
          busy = true;
          try {
            await onDefault(template.id);
          } finally {
            busy = false;
          }
        }}>設為預設：{template.name}</Button
      >
    </div>
  {/each}
</section>
<Button variant="secondary" onclick={onNew}>＋ 自訂樣板</Button>
<p>套用樣板預設文字與浮水印，保留照片座標。</p>

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
  }
  .thumbnail {
    position: relative;
    height: 104px;
    border-radius: 12px;
    overflow: hidden;
    background: linear-gradient(155deg, #dbe7df 0 45%, #81998b 45% 65%, #b6c8b9 65%);
  }
  .sample-label {
    position: absolute;
    left: 8px;
    bottom: 8px;
    padding: 5px 8px;
    font-size: 12px;
    z-index: 1;
  }
  .sample-label[data-corner='top-left'],
  .sample-label[data-corner='top-right'] {
    top: 8px;
    bottom: auto;
  }
  .sample-label[data-corner='top-right'],
  .sample-label[data-corner='bottom-right'] {
    right: 8px;
    left: auto;
  }
  .sample-watermark {
    position: absolute;
    inset: 36px 8px auto;
    text-align: center;
    color: white;
  }

  section {
    display: grid;
    gap: 12px;
  }
  .card {
    display: grid;
    gap: 8px;
    padding: 12px;
    border: 1px solid var(--pm-color-border);
    border-radius: var(--pm-radius-card);
  }
  .pick {
    display: grid;
    gap: 8px;
    text-align: left;
    min-height: 88px;
    padding: 16px;
    background: white;
    color: var(--pm-color-ink);
    border: 2px solid var(--pm-color-border);
    border-radius: var(--pm-radius-control);
  }
  .pick[aria-pressed='true'] {
    border-color: var(--pm-color-accent);
    background: var(--pm-color-pale);
  }
  span,
  p,
  small {
    font-size: 12px;
    color: var(--pm-color-muted);
  }
</style>
