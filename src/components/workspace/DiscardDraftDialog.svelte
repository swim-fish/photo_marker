<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '../ui/Button.svelte';
  let {
    busy,
    error,
    onConfirm,
    onCancel,
  }: { busy: boolean; error: string; onConfirm: () => void; onCancel: () => void } = $props();
  let dialog: HTMLDialogElement;
  onMount(() => {
    dialog.showModal();
  });
</script>

<dialog
  bind:this={dialog}
  aria-labelledby="discard-title"
  aria-describedby="discard-description"
  oncancel={(event) => {
    event.preventDefault();
    if (!busy) onCancel();
  }}
>
  <h2 id="discard-title">捨棄這份草稿？</h2>
  <p id="discard-description">
    將移除此裝置上的照片草稿與未匯出的編輯內容。原始照片、已匯出的照片與已儲存的樣板會保留。
  </p>
  {#if error}<p role="alert">{error}</p>{/if}
  <div class="actions">
    <Button variant="secondary" disabled={busy} onclick={onCancel}>繼續編輯</Button><Button
      disabled={busy}
      onclick={onConfirm}>{busy ? '正在捨棄…' : '確認捨棄'}</Button
    >
  </div>
</dialog>

<style>
  dialog {
    width: min(342px, calc(100% - 32px));
    padding: 24px;
    border: 0;
    border-radius: 18px;
    background: var(--pm-color-bg);
    color: var(--pm-color-ink);
  }
  dialog::backdrop {
    background: rgb(24 53 47 / 45%);
  }
  h2 {
    margin: 0;
    font-size: 20px;
  }
  p {
    font-size: 14px;
    line-height: 1.8;
    overflow-wrap: anywhere;
  }
  .actions {
    display: grid;
    gap: 12px;
  }
  [role='alert'] {
    color: var(--pm-color-error);
  }
</style>
