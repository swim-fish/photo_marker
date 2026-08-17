<script lang="ts">
  import { messages } from '../../i18n';

  const t = messages.en;
  let { installed = false }: { installed?: boolean } = $props();
</script>

<section class="install-help" aria-label={t.installPhotoMarker}>
  <strong>{t.installPhotoMarker}</strong>
  <p>{installed ? t.installedApp : t.installHelp}</p>
</section>

<style>
  .install-help {
    display: grid;
    gap: 0.35rem;
    padding: 0.75rem;
    border: 1px solid #334155;
    border-radius: 0.75rem;
    background: #0f172a;
  }

  p {
    margin: 0;
    color: #cbd5e1;
  }
</style>
