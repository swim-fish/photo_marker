<script lang="ts">
  import type { AnnotationTemplate } from '../../domain/templates/types';
  import { rgbaString } from '../../domain/overlays/color';
  import Button from '../ui/Button.svelte';
  let {
    templates,
    selected,
    defaultId,
    onSelect,
    onSave,
    onDefault,
    onCustomize,
  }: {
    templates: readonly AnnotationTemplate[];
    selected: AnnotationTemplate;
    defaultId?: string;
    onSelect: (value: AnnotationTemplate) => void;
    onSave: (name: string) => Promise<void>;
    onDefault: (id: string) => Promise<void>;
    onCustomize: () => void;
  } = $props();
  let name = $state(''),
    busy = $state(false);
</script>

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
<Button variant="secondary" onclick={onCustomize}>自訂文字樣式與底色</Button>
<label>樣板名稱<input bind:value={name} maxlength="80" placeholder="例如：工程巡查" /></label>
<Button
  disabled={busy || !name.trim()}
  onclick={async () => {
    busy = true;
    try {
      await onSave(name.trim());
    } finally {
      busy = false;
    }
  }}>儲存目前設定為樣板</Button
>
<p>
  樣板包含文字樣式、座標格式及浮水印；照片的四角文字與位置會保留。設定預設樣板僅影響之後匯入的照片。
</p>

<style>
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
  label {
    display: grid;
    gap: 8px;
  }
  input {
    min-height: 48px;
    padding: 10px;
    width: 100%;
    border: 1px solid var(--pm-color-border);
    border-radius: 12px;
  }
</style>
