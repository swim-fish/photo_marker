<script lang="ts">
  import PhotoNavigatorItem, { type NavigatorStatus } from './PhotoNavigatorItem.svelte';
  import { messages } from '../../i18n';

  const t = messages.en;

  export type PhotoNavigatorEntry = Readonly<{
    id: string;
    name: string;
    status: NavigatorStatus;
    provenance?: string;
    failureCode?: string;
  }>;

  let {
    items,
    activeItemId,
    onSelect = () => undefined,
    onRemove = () => undefined,
  }: {
    items: readonly PhotoNavigatorEntry[];
    activeItemId: string;
    onSelect?: (id: string) => void;
    onRemove?: (id: string) => void;
  } = $props();
</script>

<nav aria-label={t.batchPhotos}>
  <p><strong>{items.length}</strong> {t.intakeResults}</p>
  <ul>
    {#each items as item (item.id)}
      <PhotoNavigatorItem {...item} active={item.id === activeItemId} {onSelect} {onRemove} />
    {/each}
  </ul>
</nav>

<style>
  nav {
    display: grid;
    min-width: 0;
    gap: 0.65rem;
  }

  p {
    margin: 0;
    color: #cbd5e1;
  }

  ul {
    display: grid;
    min-width: 0;
    gap: 0.55rem;
    margin: 0;
    padding: 0;
  }

  @media (max-width: 767px) {
    ul {
      grid-auto-columns: minmax(12rem, 75vw);
      grid-auto-flow: column;
      overflow-x: auto;
      padding-block-end: 0.4rem;
    }
  }
</style>
