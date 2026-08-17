<script lang="ts">
  import { messages } from '../../i18n';
  import type {
    CoordinateProvenance,
    CoordinateRecord,
    Wgs84Coordinate,
  } from '../../domain/coordinates/types';
  import type { ParsedCoordinate } from '../../domain/coordinates/parseCoordinateInput';
  import CoordinateFormatSelector from './CoordinateFormatSelector.svelte';
  import CoordinateInput from './CoordinateInput.svelte';

  const t = messages.en;

  type CoordinateCardProps = {
    coordinate?: CoordinateRecord | null;
    captureCoordinate?: Wgs84Coordinate | null;
    disabled?: boolean;
    locationBusy?: boolean;
    locationError?: string;
    manualError?: string;
    displayText?: string;
    onUseCurrentLocation?: () => void;
    onManualAccepted?: (coordinate: ParsedCoordinate) => void;
    onDisplayChange?: (selection: {
      format: CoordinateRecord['displayFormat'];
      precision: number | null;
    }) => void;
  };

  let {
    coordinate = null,
    captureCoordinate = null,
    disabled = false,
    locationBusy = false,
    locationError = '',
    manualError = '',
    displayText = '',
    onUseCurrentLocation = () => undefined,
    onManualAccepted = () => undefined,
    onDisplayChange = () => undefined,
  }: CoordinateCardProps = $props();

  function provenanceLabel(provenance: CoordinateProvenance | undefined): string {
    switch (provenance) {
      case 'CAPTURE_METADATA':
        return t.captureMetadata;
      case 'CURRENT_GPS':
        return t.currentGps;
      case 'MANUAL_INPUT':
        return t.manualInput;
      default:
        return t.noAcceptedCoordinate;
    }
  }

  function formatCoordinate(value: Wgs84Coordinate | null | undefined): string {
    if (!value) return t.notAvailable;
    return `${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}`;
  }

  function formatAcquiredAt(value: string | null | undefined): string {
    if (!value) return t.notAvailable;
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? value : new Date(timestamp).toISOString();
  }
</script>

<section class="coordinate-card" aria-labelledby="coordinate-card-title">
  <div class="heading-row">
    <div>
      <p class="eyebrow">{t.coordinateEyebrow}</p>
      <h2 id="coordinate-card-title">{t.workingCoordinate}</h2>
    </div>
    <span class:valid={coordinate?.validationStatus === 'valid'} class="provenance">
      {provenanceLabel(coordinate?.provenance)}
    </span>
  </div>

  <dl class="coordinate-details">
    <div>
      <dt>{t.wgs84Value}</dt>
      <dd>{formatCoordinate(coordinate)}</dd>
    </div>
    <div>
      <dt>{t.displayFormat}</dt>
      <dd>{coordinate?.displayFormat ?? t.wgs84Dd}</dd>
    </div>
    {#if coordinate && displayText}
      <div>
        <dt>{t.displayValue}</dt>
        <dd>{displayText}</dd>
      </div>
    {/if}
    <div>
      <dt>{t.validation}</dt>
      <dd>{coordinate?.validationStatus ?? t.missing}</dd>
    </div>
    <div>
      <dt>{t.coverage}</dt>
      <dd>{coordinate?.coverageStatus ?? t.notChecked}</dd>
    </div>
    {#if coordinate?.zone}
      <div>
        <dt>{t.zone}</dt>
        <dd>
          {coordinate.zone}
          {#if coordinate.zoneAutoResolved}
            ({t.autoResolved}){/if}
        </dd>
      </div>
    {/if}
    {#if coordinate?.precision !== null && coordinate?.precision !== undefined}
      <div>
        <dt>{t.precision}</dt>
        <dd>{coordinate.precision}</dd>
      </div>
    {/if}
    {#if coordinate?.provenance === 'CURRENT_GPS'}
      <div>
        <dt>{t.accuracy}</dt>
        <dd>
          {coordinate.accuracyMeters === null
            ? t.notAvailable
            : `${coordinate.accuracyMeters} ${t.metresSuffix}`}
        </dd>
      </div>
      <div>
        <dt>{t.acquired}</dt>
        <dd>{formatAcquiredAt(coordinate.acquiredAt)}</dd>
      </div>
    {/if}
  </dl>

  {#if captureCoordinate}
    <p class="capture-note">
      {t.sourceCaptureCoordinate}
      <strong>{formatCoordinate(captureCoordinate)}</strong>{t.workingCoordinateDoesNotRewrite}
    </p>
  {/if}

  {#if locationError}
    <p class="error" role="alert">{locationError}</p>
  {/if}
  {#if manualError}
    <p class="error" role="alert">{manualError}</p>
  {/if}

  <button
    type="button"
    class="location-button"
    disabled={disabled || locationBusy}
    aria-busy={locationBusy}
    onclick={onUseCurrentLocation}
  >
    {locationBusy ? t.requestCurrentLocation : t.useCurrentLocation}
  </button>

  {#if coordinate}
    <CoordinateFormatSelector
      format={coordinate.displayFormat}
      precision={coordinate.precision}
      {disabled}
      onChange={onDisplayChange}
    />
  {/if}

  <CoordinateInput {disabled} onAccepted={onManualAccepted} />
</section>

<style>
  .coordinate-card {
    display: grid;
    gap: 1rem;
    padding: clamp(1rem, 3vw, 1.5rem);
    border: 1px solid #334155;
    border-radius: 1rem;
    color: #e2e8f0;
    background: #0f172a;
  }

  .heading-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  h2,
  p {
    margin: 0;
  }

  h2 {
    font-size: clamp(1.2rem, 2vw, 1.5rem);
  }

  .eyebrow {
    margin-bottom: 0.25rem;
    color: #93c5fd;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .provenance {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 0.75rem;
    border: 1px solid #fbbf24;
    border-radius: 999px;
    color: #fde68a;
    font-size: 0.85rem;
    font-weight: 700;
    text-align: center;
  }

  .provenance.valid {
    border-color: #34d399;
    color: #a7f3d0;
  }

  .coordinate-details {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.7rem;
    margin: 0;
  }

  .coordinate-details div {
    min-width: 0;
    padding: 0.7rem;
    border-radius: 0.65rem;
    background: #172033;
  }

  dt {
    color: #94a3b8;
    font-size: 0.8rem;
  }

  dd {
    margin: 0.2rem 0 0;
    overflow-wrap: anywhere;
    color: #f8fafc;
    font-variant-numeric: tabular-nums;
  }

  .capture-note {
    padding: 0.7rem 0.8rem;
    border-left: 3px solid #60a5fa;
    color: #cbd5e1;
    background: #172033;
  }

  .error {
    padding: 0.7rem 0.8rem;
    border: 1px solid #fb7185;
    border-radius: 0.65rem;
    color: #ffe4e6;
    background: #4c0519;
  }

  button {
    min-height: 44px;
    width: fit-content;
    padding: 0.65rem 1rem;
    border: 1px solid #60a5fa;
    border-radius: 0.65rem;
    color: #eff6ff;
    background: #1d4ed8;
    cursor: pointer;
    font-weight: 700;
  }

  button:focus-visible {
    outline: 3px solid #93c5fd;
    outline-offset: 2px;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }

  @media (max-width: 40rem) {
    .heading-row {
      display: grid;
    }

    .provenance {
      width: fit-content;
    }

    .coordinate-details {
      grid-template-columns: 1fr;
    }
  }
</style>
