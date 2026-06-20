<script setup lang="ts">
import { onMounted, ref } from 'vue'
import WarmHubContent from './WarmHubContent.vue'
import WarmHubHeader from './WarmHubHeader.vue'
import WarmHubUploadDialog from './WarmHubUploadDialog.vue'
import WarmPdfImportDialog from '@/components/drawing/WarmPdfImportDialog.vue'
import WarmOrderOverviewDialog from '@/components/orders/WarmOrderOverviewDialog.vue'
import WarmOrderSidebar from '@/components/orders/WarmOrderSidebar.vue'
import WarmNetworkDiagnosticsDialog from '@/components/system/WarmNetworkDiagnosticsDialog.vue'
import WarmDrawingTrashDialog from '@/components/trash/WarmDrawingTrashDialog.vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
const networkDiagnosticsOpen = ref(false)
const pdfImportOpen = ref(false)

onMounted(() => {
  void store.initialize()
})

function openDrawingTrash() {
  void store.openDrawingTrash().catch(() => undefined)
}
</script>

<template>
  <div class="document-hub-shell" :class="{ 'orders-collapsed': store.orderSidebarCollapsed }">
    <WarmHubHeader
      @open-network="networkDiagnosticsOpen = true"
      @open-pdf-import="pdfImportOpen = true"
      @open-trash="openDrawingTrash"
    />
    <main class="hub-body">
      <WarmOrderSidebar />
      <WarmHubContent />
    </main>
    <WarmOrderOverviewDialog />
    <WarmHubUploadDialog v-model:visible="store.uploadDialogOpen" />
    <WarmPdfImportDialog v-model:visible="pdfImportOpen" />
    <WarmDrawingTrashDialog v-model:visible="store.drawingTrashDialogOpen" />
    <WarmNetworkDiagnosticsDialog v-model:visible="networkDiagnosticsOpen" />
  </div>
</template>

<style scoped>
.document-hub-shell {
  position: relative;
  --glass-edge: rgba(255, 255, 255, 0.92);
  --glass-fill: rgba(255, 255, 255, 0.12);
  --glass-shadow: rgba(72, 39, 18, 0.2);
  --glass-green: rgba(92, 145, 139, 0.28);
  --glass-amber: rgba(213, 125, 52, 0.08);
  --order-column-width: 222px;
  isolation: isolate;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 11px;
  height: 100vh;
  padding: 12px;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 118%, rgba(255, 255, 255, 0.38) 0%, rgba(255, 255, 255, 0.12) 30%, transparent 66%),
    linear-gradient(90deg, rgba(89, 118, 112, 0.045) 1px, transparent 1px) 0 0 / 30px 30px,
    linear-gradient(0deg, rgba(89, 118, 112, 0.04) 1px, transparent 1px) 0 0 / 30px 30px,
    linear-gradient(118deg, rgba(255, 255, 255, 0.98) 0 8%, rgba(255, 255, 255, 0.26) 24%, rgba(255, 255, 255, 0.03) 54%),
    linear-gradient(304deg, var(--glass-green) 0 22%, rgba(113, 156, 148, 0.12) 46%, transparent 68%),
    linear-gradient(24deg, var(--glass-amber), rgba(255, 255, 255, 0.06) 42%, transparent 70%),
    linear-gradient(160deg, #fffaf0 0%, #eef0df 38%, #dbe9df 100%);
  perspective: 1400px;
}

.document-hub-shell::before,
.document-hub-shell::after {
  position: absolute;
  content: '';
  pointer-events: none;
}

.document-hub-shell::before {
  inset: 7px;
  z-index: -1;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 30px;
  background:
    linear-gradient(118deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.12) 28%, transparent 52%),
    linear-gradient(306deg, rgba(104, 156, 151, 0.22), rgba(104, 156, 151, 0.06) 46%, transparent 68%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.025));
  box-shadow:
    0 0 0 1px rgba(132, 89, 45, 0.05),
    0 44px 110px rgba(79, 43, 18, 0.18),
    0 0 140px rgba(255, 255, 255, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.98),
    inset 28px 0 58px rgba(255, 255, 255, 0.25),
    inset -34px -20px 72px rgba(87, 132, 126, 0.14),
    inset 0 -36px 88px rgba(178, 100, 45, 0.035),
    inset 0 0 0 1px rgba(255, 255, 255, 0.26);
  backdrop-filter: blur(8px) saturate(1.08);
  -webkit-backdrop-filter: blur(8px) saturate(1.08);
}

.document-hub-shell::after {
  inset: -30% auto auto -7%;
  z-index: -1;
  width: 55%;
  height: 130%;
  background:
    linear-gradient(108deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.08) 52%, transparent),
    linear-gradient(88deg, transparent, rgba(255, 255, 255, 0.16), transparent 72%);
  filter: blur(1px);
  transform: rotate(9deg);
}

.hub-body {
  display: grid;
  grid-template-columns: var(--order-column-width) minmax(0, 1fr);
  min-height: 0;
  gap: 11px;
  contain: layout paint style;
  transform: translateZ(0);
  overflow: visible;
}

.document-hub-shell.orders-collapsed {
  --order-column-width: 58px;
}

@media (max-width: 1320px) {
  .document-hub-shell {
    --order-column-width: 202px;
    padding: 9px;
  }

  .document-hub-shell.orders-collapsed {
    --order-column-width: 54px;
  }

  .hub-body {
    gap: 8px;
  }

}

@media (max-width: 1320px), (prefers-reduced-motion: reduce) {
  .document-hub-shell::before {
    box-shadow:
      0 22px 48px rgba(79, 43, 18, 0.14),
      inset 0 1px 0 rgba(255, 255, 255, 0.76),
      inset 0 -18px 44px rgba(178, 100, 45, 0.06);
  }
}
</style>
