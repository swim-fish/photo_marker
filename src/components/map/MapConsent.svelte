<script lang="ts">
  import Button from '../ui/Button.svelte';
  let {
    open = false,
    onAccept = () => {},
    onDecline = () => {},
  }: { open?: boolean; onAccept?: () => void; onDecline?: () => void } = $props();
</script>

{#if open}<div
    role="dialog"
    tabindex="-1"
    aria-modal="false"
    aria-label="地圖連線說明"
    class="consent"
  >
    <h2>使用線上地圖</h2>
    <p>圖資包含 OpenStreetMap、內政部國土測繪中心（NLSC）與 Google 底圖／路網疊圖。</p>
    <p>
      載入所選圖資會將 IP 位址與瀏覽區域傳送給對應服務；OpenStreetMap
      也會收到本站來源網址。照片、文字與草稿不會上傳。
    </p>
    <p>你可以隨時撤銷同意，也可以離線手動輸入座標。</p>
    <Button onclick={onAccept}>同意並開啟地圖</Button><Button
      variant="secondary"
      onclick={onDecline}>暫不使用</Button
    >
  </div>{/if}

<style>
  .consent {
    display: grid;
    gap: 12px;
    padding: 20px;
    border-radius: 18px;
    background: var(--pm-color-pale);
  }
  h2,
  p {
    margin: 0;
  }
  h2 {
    font-size: 18px;
  }
  p {
    line-height: 1.7;
  }
</style>
