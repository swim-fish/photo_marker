<script lang="ts">
  import type { CoordinateDisplayFormat } from '../../domain/coordinates/types';
  import type { OverlayCorner } from '../../domain/overlays/types';
  import { messages } from '../../i18n';
  import CornerPicker from './CornerPicker.svelte';

  export type CoordinateSelectionMode = 'single' | 'multiple';

  const t = messages.en;

  let {
    mode,
    formats,
    corner,
    onModeChange = () => undefined,
    onFormatToggle = () => undefined,
    onCornerChange = () => undefined,
  }: {
    mode: CoordinateSelectionMode;
    formats: readonly CoordinateDisplayFormat[];
    corner: OverlayCorner;
    onModeChange?: (mode: CoordinateSelectionMode) => void;
    onFormatToggle?: (format: CoordinateDisplayFormat) => void;
    onCornerChange?: (corner: OverlayCorner) => void;
  } = $props();

  const options: readonly { value: CoordinateDisplayFormat; label: string }[] = [
    { value: 'WGS84_DD', label: t.formatWgs84Dd },
    { value: 'WGS84_DMS', label: t.formatWgs84Dms },
    { value: 'TWD97_TM2', label: t.formatTwd97 },
    { value: 'TWD67_TM2', label: t.formatTwd67 },
    { value: 'MGRS', label: t.formatMgrs },
    { value: 'TAIPOWER', label: t.formatTaipower },
  ];
</script>

<section aria-labelledby="coordinate-overlay-options-title">
  <div>
    <h3 id="coordinate-overlay-options-title">{t.coordinatesOnPhoto}</h3>
    <p>{t.coordinateSelectionHelp}</p>
  </div>
  <fieldset class="mode">
    <legend>{t.selectionMode}</legend>
    <label>
      <input
        type="radio"
        name="coordinate-selection-mode"
        checked={mode === 'single'}
        onchange={() => onModeChange('single')}
      />
      {t.singleCoordinate}
    </label>
    <label>
      <input
        type="radio"
        name="coordinate-selection-mode"
        checked={mode === 'multiple'}
        onchange={() => onModeChange('multiple')}
      />
      {t.multipleCoordinates}
    </label>
  </fieldset>
  <fieldset class="formats">
    <legend>{t.coordinateFormats}</legend>
    {#each options as option (option.value)}
      <label>
        <input
          type={mode === 'single' ? 'radio' : 'checkbox'}
          name={mode === 'single' ? 'coordinate-format' : undefined}
          checked={formats.includes(option.value)}
          onchange={() => onFormatToggle(option.value)}
        />
        {option.label}
      </label>
    {/each}
  </fieldset>
  <CornerPicker label={t.coordinateCorner} value={corner} onChange={onCornerChange} />
</section>

<style>
  section,
  fieldset {
    display: grid;
    gap: 0.75rem;
  }

  section {
    gap: 1rem;
  }

  h3,
  p {
    margin: 0;
  }

  p {
    margin-top: 0.25rem;
    color: #cbd5e1;
  }

  fieldset {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }

  legend {
    margin-bottom: 0.5rem;
    font-weight: 700;
  }

  .mode,
  .formats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .formats {
    grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
  }

  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 44px;
    padding: 0.45rem 0.6rem;
    border: 1px solid #475569;
    border-radius: 0.6rem;
  }

  input {
    width: 1.1rem;
    height: 1.1rem;
  }
</style>
