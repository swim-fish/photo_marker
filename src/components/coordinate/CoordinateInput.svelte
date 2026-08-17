<script lang="ts">
  import type { CoordinateInputFormat, CoordinateZone } from '../../domain/coordinates/types';
  import {
    parseCoordinateInput,
    type ParsedCoordinate,
  } from '../../domain/coordinates/parseCoordinateInput';
  import type { CoordinateErrorCode } from '../../domain/coordinates/result';
  import { messages } from '../../i18n';
  import CoordinateErrors from './CoordinateErrors.svelte';

  const t = messages.en;

  let {
    disabled = false,
    onAccepted = () => undefined,
  }: {
    disabled?: boolean;
    onAccepted?: (coordinate: ParsedCoordinate) => void;
  } = $props();

  let format = $state<CoordinateInputFormat>('WGS84_DD');
  let latitude = $state('');
  let longitude = $state('');
  let easting = $state('');
  let northing = $state('');
  let raw = $state('');
  let zone = $state<'' | `${CoordinateZone}`>('');
  let errorCode = $state<CoordinateErrorCode | null>(null);
  let acceptedNotice = $state('');

  function inputValue(): string {
    if (format === 'WGS84_DD') return `${latitude}, ${longitude}`;
    if (format === 'TWD97_TM2' || format === 'TWD67_TM2') {
      return `${easting}, ${northing}`;
    }
    return raw;
  }

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    const result = parseCoordinateInput(inputValue(), {
      format,
      zone: zone ? (Number(zone) as CoordinateZone) : null,
    });
    if (!result.ok) {
      errorCode = result.error.code;
      acceptedNotice = '';
      return;
    }
    errorCode = null;
    acceptedNotice = result.value.zoneAutoResolved
      ? `${t.zone} ${result.value.zone} ${t.zoneAutoResolvedNotice}`
      : t.coordinateAccepted;
    onAccepted(result.value);
  }
</script>

<form class="coordinate-input" aria-labelledby="coordinate-input-title" onsubmit={submit}>
  <h3 id="coordinate-input-title">{t.manualCoordinate}</h3>
  <label>
    {t.inputFormat}
    <select
      bind:value={format}
      {disabled}
      onchange={() => {
        errorCode = null;
        acceptedNotice = '';
      }}
    >
      <option value="WGS84_DD">{t.formatWgs84Dd}</option>
      <option value="WGS84_DMS">{t.formatWgs84Dms}</option>
      <option value="TWD97_TM2">{t.formatTwd97}</option>
      <option value="TWD67_TM2">{t.formatTwd67}</option>
      <option value="MGRS">{t.formatMgrs}</option>
      <option value="TAIPOWER">{t.formatTaipower}</option>
    </select>
  </label>

  {#if format === 'WGS84_DD'}
    <div class="fields">
      <label
        >{t.latitudeWgs84}<input type="number" step="any" bind:value={latitude} {disabled} /></label
      >
      <label
        >{t.longitudeWgs84}<input
          type="number"
          step="any"
          bind:value={longitude}
          {disabled}
        /></label
      >
    </div>
  {:else if format === 'WGS84_DMS'}
    <label
      >{t.wgs84DmsCoordinate}<input
        bind:value={raw}
        placeholder={t.wgs84DmsExample}
        {disabled}
      /></label
    >
  {:else if format === 'TWD97_TM2' || format === 'TWD67_TM2'}
    <div class="fields">
      <label>{t.easting}<input type="number" step="any" bind:value={easting} {disabled} /></label>
      <label>{t.northing}<input type="number" step="any" bind:value={northing} {disabled} /></label>
    </div>
    {#if format === 'TWD97_TM2'}
      <label>
        {t.tm2Zone}
        <select bind:value={zone} {disabled}>
          <option value="">{t.autoResolve}</option>
          <option value="119">119</option>
          <option value="121">121</option>
        </select>
      </label>
    {:else}
      <p class="hint">{t.twd67ZoneNotice}</p>
    {/if}
  {:else if format === 'MGRS'}
    <label
      >{t.mgrsCoordinate}<input bind:value={raw} placeholder="51RUH5517069437" {disabled} /></label
    >
  {:else}
    <label
      >{t.taipowerCoordinate}<input bind:value={raw} placeholder="B7039 BD32" {disabled} /></label
    >
  {/if}

  <CoordinateErrors code={errorCode} {format} />
  {#if acceptedNotice}<p role="status" class="accepted">{acceptedNotice}</p>{/if}
  <button type="submit" {disabled}>{t.useManualCoordinate}</button>
</form>

<style>
  .coordinate-input,
  label {
    display: grid;
    gap: 0.55rem;
  }

  .coordinate-input {
    padding-top: 1rem;
    border-top: 1px solid #334155;
  }

  h3,
  p {
    margin: 0;
  }

  .fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  input,
  select,
  button {
    min-height: 44px;
    font: inherit;
  }

  input,
  select {
    min-width: 0;
    width: 100%;
    padding: 0.55rem 0.65rem;
    border: 1px solid #64748b;
    border-radius: 0.6rem;
    color: #f8fafc;
    background: #0f172a;
  }

  button {
    width: fit-content;
    padding: 0.65rem 1rem;
    border: 1px solid #60a5fa;
    border-radius: 0.65rem;
    color: #eff6ff;
    background: #1d4ed8;
    font-weight: 700;
  }

  .hint {
    color: #cbd5e1;
  }

  .accepted {
    color: #a7f3d0;
  }

  @media (max-width: 40rem) {
    .fields {
      grid-template-columns: 1fr;
    }
  }
</style>
