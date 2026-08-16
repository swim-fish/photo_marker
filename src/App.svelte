<script lang="ts">
  import { messages } from './i18n';

  const appMessages = messages.en;
</script>

<svelte:head>
  <meta name="application-name" content={appMessages.appName} />
</svelte:head>

<main class="app-shell">
  <section class="welcome-card" aria-labelledby="app-title">
    <div class="brand-mark" aria-hidden="true">
      <img src="/icons/icon.svg" alt="" width="56" height="56" />
    </div>
    <p class="eyebrow">{appMessages.offlineLabel}</p>
    <h1 id="app-title">{appMessages.appName}</h1>
    <p class="intro">{appMessages.description}</p>
    <button type="button" class="primary-action">{appMessages.importAction}</button>
    <p class="status" role="status">{appMessages.readyStatus}</p>
  </section>
</main>
