<script lang="ts">
  import type { CoordinateErrorCode } from '../../domain/coordinates/result';
  import { messages } from '../../i18n';

  const t = messages.en;

  let {
    code,
    format,
  }: {
    code: CoordinateErrorCode | null;
    format?: string;
  } = $props();

  function message(): string {
    if (code === 'out-of-coverage' && format === 'TAIPOWER') {
      return t.taipowerCoverageError;
    }
    switch (code) {
      case 'malformed':
        return t.coordinateMalformedError;
      case 'out-of-range':
        return t.coordinateRangeError;
      case 'out-of-coverage':
        return t.coordinateCoverageError;
      case 'unsupported-precision':
        return t.coordinatePrecisionError;
      case 'ambiguous-zone':
        return t.coordinateZoneError;
      default:
        return '';
    }
  }
</script>

{#if code}
  <p class="error" role="alert">{message()}</p>
{/if}

<style>
  .error {
    margin: 0;
    padding: 0.7rem 0.8rem;
    border: 1px solid #fb7185;
    border-radius: 0.65rem;
    color: #ffe4e6;
    background: #4c0519;
  }
</style>
