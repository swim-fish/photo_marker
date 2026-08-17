<script lang="ts">
  import type { CoordinateDisplayFormat } from '../../domain/coordinates/types';
  import { messages } from '../../i18n';

  const t = messages.en;

  let {
    format,
    precision,
    disabled = false,
    onChange = () => undefined,
  }: {
    format: CoordinateDisplayFormat;
    precision: number | null;
    disabled?: boolean;
    onChange?: (selection: { format: CoordinateDisplayFormat; precision: number | null }) => void;
  } = $props();

  function changeFormat(event: Event): void {
    const next = (event.currentTarget as HTMLSelectElement).value as CoordinateDisplayFormat;
    onChange({
      format: next,
      precision: next === 'MGRS' ? 5 : next === 'TAIPOWER' ? 9 : null,
    });
  }

  function changePrecision(event: Event): void {
    onChange({ format, precision: Number((event.currentTarget as HTMLSelectElement).value) });
  }
</script>

<section class="format-selector" aria-labelledby="display-format-title">
  <h3 id="display-format-title">{t.coordinateDisplay}</h3>
  <label>
    {t.displayFormat}
    <select value={format} {disabled} onchange={changeFormat}>
      <option value="WGS84_DD">{t.formatWgs84Dd}</option>
      <option value="WGS84_DMS">{t.formatWgs84Dms}</option>
      <option value="TWD97_TM2">{t.formatTwd97}</option>
      <option value="TWD67_TM2">{t.formatTwd67}</option>
      <option value="MGRS">{t.formatMgrs}</option>
      <option value="TAIPOWER">{t.formatTaipower}</option>
    </select>
  </label>
  {#if format === 'MGRS' || format === 'TAIPOWER'}
    <label>
      {t.precision}
      <select
        value={precision ?? (format === 'MGRS' ? 5 : 9)}
        {disabled}
        onchange={changePrecision}
      >
        {#if format === 'MGRS'}
          {#each [1, 2, 3, 4, 5] as value (value)}<option {value}>{value}</option>{/each}
        {:else}
          <option value="9">9</option>
          <option value="11">11</option>
        {/if}
      </select>
    </label>
  {/if}
</section>

<style>
  .format-selector,
  label {
    display: grid;
    gap: 0.55rem;
  }

  .format-selector {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding-top: 1rem;
    border-top: 1px solid #334155;
  }

  h3 {
    grid-column: 1 / -1;
    margin: 0;
  }

  select {
    min-height: 44px;
    min-width: 0;
    width: 100%;
  }

  @media (max-width: 40rem) {
    .format-selector {
      grid-template-columns: 1fr;
    }
  }
</style>
