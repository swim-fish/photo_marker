<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { AnnotationTemplate, CornerTexts } from '../../domain/templates/types';
  import type { WatermarkAsset } from '../../domain/watermarks/types';
  import { importWatermark } from '../../domain/watermarks/intake';
  import { sanitizeTemplate } from '../../domain/templates/templateService';
  import CornerTextEditor from '../overlays/CornerTextEditor.svelte';
  import WatermarkEditor from '../watermarks/WatermarkEditor.svelte';
  import RgbaPicker from '../ui/RgbaPicker.svelte';
  import NumberStepper from '../ui/NumberStepper.svelte';
  import CoordinateOptions from '../coordinates/CoordinateOptions.svelte';
  import Button from '../ui/Button.svelte';
  import SettingRow from '../ui/SettingRow.svelte';
  import type { SourcePhoto } from '../../domain/photos/types';
  let {
    photo,
    storedAssets = [],
    isDefault = false,
    onHeading,
    initial,
    texts,
    creating = false,
    onSave,
    onCancel,
  }: {
    photo?: SourcePhoto;
    storedAssets?: readonly WatermarkAsset[];
    isDefault?: boolean;
    onHeading?: (title: string, subtitle: string) => void;
    initial: AnnotationTemplate;
    texts: CornerTexts;
    creating?: boolean;
    onSave: (
      value: AnnotationTemplate,
      assets: readonly WatermarkAsset[],
      makeDefault: boolean,
    ) => Promise<boolean>;
    onCancel: () => void;
  } = $props();
  let value = $state(
    untrack(() => ({
      ...$state.snapshot(initial),
      name: creating ? '' : initial.name,
      defaultTexts: $state.snapshot(creating ? texts : (initial.defaultTexts ?? texts)),
    })),
  );
  let makeDefault = $state(untrack(() => !creating && isDefault));
  type Panel = 'main' | 'texts' | 'watermark' | 'appearance' | 'coordinate';
  let panel = $state<Panel>('main'),
    busy = $state(false),
    importing = $state(false),
    error = $state(''),
    valid = $state(true);
  let checkpoint: typeof value | null = null;
  let assets = $state<WatermarkAsset[]>([]);
  let generation = 0;
  const cornerLabels = {
    'top-left': '左上角',
    'top-right': '右上角',
    'bottom-left': '左下角',
    'bottom-right': '右下角',
  };
  $effect(() => {
    const titles = {
      main: creating ? '自訂樣板' : '編輯樣板',
      texts: '四角預設文字',
      watermark: '樣板浮水印',
      appearance: '文字框樣式',
      coordinate: '座標格式與位置',
    };
    const captions = {
      main: '四角文字與浮水印',
      texts: '設定此樣板的文字',
      watermark: '單一位置或隨機重複',
      appearance: '文字樣式與 RGBA 底色',
      coordinate: '設定格式與顯示角落',
    };
    onHeading?.(titles[panel], `${value.name || '新樣板'} · ${captions[panel]}`);
  });
  onDestroy(() => {
    generation++;
  });
  function open(next: Panel): void {
    checkpoint = $state.snapshot(value);
    panel = next;
    error = '';
    valid = true;
  }
  export function back(): void {
    if (busy) return;
    generation++;
    importing = false;
    error = '';
    if (panel === 'main') onCancel();
    else {
      if (checkpoint) value = checkpoint;
      panel = 'main';
      valid = true;
    }
  }
  function done(): void {
    if (!valid || importing) return;
    generation++;
    panel = 'main';
    error = '';
  }
  async function image(file: File): Promise<void> {
    const current = ++generation;
    importing = true;
    const result = await importWatermark(file);
    if (current !== generation) return;
    importing = false;
    if (!result.ok) {
      error = 'PNG 浮水印無法讀取，請檢查格式、尺寸與檔案大小。';
      return;
    }
    assets = [...assets.filter((a) => a.id !== result.value.id), result.value];
    value = {
      ...value,
      watermark: { ...value.watermark, kind: 'image', mode: 'single', assetId: result.value.id },
    };
    error = '';
  }
  async function save(): Promise<void> {
    const clean = sanitizeTemplate($state.snapshot(value));
    if (!clean) {
      error = '請檢查樣板名稱與設定。';
      return;
    }
    busy = true;
    try {
      if (
        !(await onSave(
          clean,
          assets.filter((a) => a.id === clean.watermark.assetId),
          makeDefault,
        ))
      )
        error = '樣板儲存失敗，請重試。';
    } finally {
      busy = false;
    }
  }
</script>

<section class:texts={panel === 'texts'} aria-label="樣板編輯" aria-busy={busy || importing}>
  {#if error}<p role="alert">{error}</p>{/if}
  {#if panel === 'main'}
    <div class="settings">
      <label class="pm-field"
        ><span>樣板名稱</span><input
          bind:value={value.name}
          maxlength="80"
          placeholder="例如：工程巡查"
        /></label
      >
      <SettingRow
        label="四角預設文字"
        detail={value.defaultTexts['top-left']
          ? `左上：${value.defaultTexts['top-left']}`
          : '四個角落分別設定'}
        onclick={() => open('texts')}
      />
      <SettingRow label="文字框" detail="文字樣式與 RGBA 底色" onclick={() => open('appearance')} />
      <SettingRow
        label="座標格式與位置"
        detail={`${value.coordinateFormat.replace('_DD', '').replace('_TM2', '')} · ${cornerLabels[value.coordinateCorner]}`}
        onclick={() => open('coordinate')}
      />
      <SettingRow
        label="浮水印"
        detail={value.watermark.enabled
          ? `已開啟 · ${value.watermark.kind === 'image' ? 'PNG 圖片' : value.watermark.text || '尚未填寫文字'}`
          : '未啟用'}
        onclick={() => open('watermark')}
      />
    </div>
    <div class="actions main-actions">
      <label class="default-choice"
        ><input
          type="checkbox"
          bind:checked={makeDefault}
          disabled={!creating && isDefault}
        />設為下次匯入的預設樣板</label
      >
      <p>儲存四角預設文字與浮水印，照片座標不變。</p>
      <Button disabled={busy || !value.name.trim()} onclick={save}
        >{creating ? '儲存目前設定為樣板' : '儲存變更'}</Button
      >
      <Button variant="secondary" disabled={busy} onclick={back}>取消</Button>
    </div>
  {:else}
    {#if panel === 'texts'}
      <CornerTextEditor
        value={value.defaultTexts}
        onChange={(texts) => (value = { ...value, defaultTexts: texts })}
      />
      <p>套用此樣板時帶入以上文字；留白可清空該角落。</p>
    {:else if panel === 'watermark'}
      <WatermarkEditor
        compact
        {photo}
        assets={[...storedAssets, ...assets]}
        value={value.watermark}
        onChange={(watermark) => (value = { ...value, watermark })}
        onImage={image}
      />
    {:else if panel === 'appearance'}
      <NumberStepper
        label="文字大小"
        value={Math.round(value.appearance.fontSize * 390)}
        min={8}
        max={96}
        onChange={(n) =>
          (value = { ...value, appearance: { ...value.appearance, fontSize: n / 390 } })}
      />
      <label
        >文字顏色<input
          type="color"
          value={'#' +
            [
              value.appearance.textColor.red,
              value.appearance.textColor.green,
              value.appearance.textColor.blue,
            ]
              .map((n) => n.toString(16).padStart(2, '0'))
              .join('')}
          oninput={(event) => {
            const hex = event.currentTarget.value;
            value = {
              ...value,
              appearance: {
                ...value.appearance,
                textColor: {
                  red: parseInt(hex.slice(1, 3), 16),
                  green: parseInt(hex.slice(3, 5), 16),
                  blue: parseInt(hex.slice(5, 7), 16),
                  alpha: 1,
                },
              },
            };
          }}
        /></label
      >
      <NumberStepper
        label="文字框內距"
        value={Math.round(value.appearance.padding * 390)}
        min={0}
        max={40}
        onChange={(n) =>
          (value = { ...value, appearance: { ...value.appearance, padding: n / 390 } })}
      />
      <NumberStepper
        label="文字框圓角"
        value={Math.round(value.appearance.cornerRadius * 390)}
        min={0}
        max={40}
        onChange={(n) =>
          (value = { ...value, appearance: { ...value.appearance, cornerRadius: n / 390 } })}
      />
      <RgbaPicker
        value={value.appearance.backgroundColor}
        onChange={(color) =>
          (value = { ...value, appearance: { ...value.appearance, backgroundColor: color } })}
        onValidityChange={(v) => (valid = v)}
      />
    {:else}
      <label
        >座標格式<select aria-label="座標格式" bind:value={value.coordinateFormat}
          ><option value="WGS84_DD">WGS84</option><option value="TWD97_TM2">TWD97</option><option
            value="MGRS">MGRS</option
          ></select
        ></label
      >
      <label
        >座標位置<select bind:value={value.coordinateCorner}
          ><option value="top-left">左上角</option><option value="top-right">右上角</option><option
            value="bottom-left">左下角</option
          ><option value="bottom-right">右下角</option></select
        ></label
      >
      {#if value.coordinateFormat === 'TWD97_TM2'}<label
          >中央經線<select bind:value={value.zone}
            ><option value={121}>121°</option><option value={119}>119°</option></select
          ></label
        >{/if}
      <CoordinateOptions
        {value}
        onChange={(template) => (value = { ...template, defaultTexts: value.defaultTexts })}
      />
    {/if}
    {#if importing}<p role="status">讀取 PNG 中…</p>{/if}
    <div class="actions" class:watermark-actions={panel === 'watermark'}>
      <Button disabled={!valid || importing} onclick={done}>完成，返回樣板</Button><Button
        variant="secondary"
        onclick={back}>取消</Button
      >
    </div>
  {/if}
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 661px;
  }
  .settings {
    display: grid;
    gap: 10px;
  }
  .texts {
    min-height: 677px;
    padding-top: 16px;
  }
  .actions {
    display: grid;
    gap: 12px;
    margin-top: auto;
    padding-top: 24px;
  }
  .default-choice {
    display: flex !important;
    align-items: center;
    gap: 8px;
    color: var(--pm-color-accent);
    font-size: 14px;
    font-weight: 500;
    min-height: 32px;
  }
  .default-choice input {
    width: 18px !important;
    min-height: 18px !important;
    height: 18px;
    accent-color: var(--pm-color-accent);
  }
  .main-actions {
    padding-top: 32px;
  }
  .watermark-actions {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    padding-top: 24px;
  }
  .watermark-actions :global(button) {
    padding-inline: 8px;
    font-size: 14px;
  }
  label:not(.pm-field) {
    display: grid;
    gap: 8px;
  }
  label:not(.pm-field) input,
  select {
    width: 100%;
    min-width: 0;
    min-height: 50px;
    padding: 12px;
    border: 0;
    border-radius: 14px;
    background: white;
    color: var(--pm-color-ink);
  }
  p {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--pm-color-muted);
    overflow-wrap: anywhere;
  }
</style>
