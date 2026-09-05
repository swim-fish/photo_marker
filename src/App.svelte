<script lang="ts">
  import Workspace from './components/workspace/Workspace.svelte';
  import { getMessages } from './i18n';

  const t = getMessages();
</script>

<svelte:head>
  <meta name="application-name" content={t.appName} />
  <meta name="description" content={t.metaDescription} />
</svelte:head>

<Workspace />
