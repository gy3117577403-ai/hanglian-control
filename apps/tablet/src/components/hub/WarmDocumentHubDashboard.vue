<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import WarmHubContent from './WarmHubContent.vue'
import WarmHubHeader from './WarmHubHeader.vue'
import WarmOrderSidebar from '@/components/orders/WarmOrderSidebar.vue'
import { createWarmAsyncComponent } from '@/lib/async-components'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
const route = useRoute()
const networkDiagnosticsOpen = ref(false)
const WarmHubUploadDialog = createWarmAsyncComponent(() => import('./WarmHubUploadDialog.vue'), {
  name: 'WarmHubUploadDialog',
  label: '正在加载上传面板...',
})
const WarmPdfImportDialog = createWarmAsyncComponent(() => import('@/components/drawing/WarmPdfImportDialog.vue'), {
  name: 'WarmPdfImportDialog',
  label: '正在加载 PDF 导入...',
})
const WarmCustomerProductMaintenanceDialog = createWarmAsyncComponent(() => import('@/components/maintenance/WarmCustomerProductMaintenanceDialog.vue'), {
  name: 'WarmCustomerProductMaintenanceDialog',
  label: '正在加载客户产品维护...',
})
const WarmCreateProductArchiveDialog = createWarmAsyncComponent(() => import('@/components/drawing/WarmCreateProductArchiveDialog.vue'), {
  name: 'WarmCreateProductArchiveDialog',
  label: '正在加载产品建档...',
})
const WarmOrderOverviewDialog = createWarmAsyncComponent(() => import('@/components/orders/WarmOrderOverviewDialog.vue'), {
  name: 'WarmOrderOverviewDialog',
  label: '正在加载订单总览...',
})
const WarmDrawingTrashDialog = createWarmAsyncComponent(() => import('@/components/trash/WarmDrawingTrashDialog.vue'), {
  name: 'WarmDrawingTrashDialog',
  label: '正在加载回收站...',
})
const WarmNetworkDiagnosticsDialog = createWarmAsyncComponent(() => import('@/components/system/WarmNetworkDiagnosticsDialog.vue'), {
  name: 'WarmNetworkDiagnosticsDialog',
  label: '正在加载网络诊断...',
})

onMounted(() => {
  void store.initialize()
})

watch(() => route.fullPath, () => {
  void store.restoreDrawingRouteFromCurrentUrl('direct_url')
})

function openDrawingTrash() {
  void store.openDrawingTrash().catch(() => undefined)
}
</script>

<template>
  <div class="document-hub-shell" :class="{ 'orders-collapsed': store.effectiveOrderSidebarCollapsed }">
    <WarmHubHeader
      @open-network="networkDiagnosticsOpen = true"
      @open-pdf-import="store.pdfImportDialogOpen = true"
      @open-maintenance="void store.openCustomerProductMaintenance()"
      @open-trash="openDrawingTrash"
    />
    <main class="hub-body">
      <WarmOrderSidebar />
      <WarmHubContent />
    </main>
    <WarmOrderOverviewDialog v-if="store.orderOverviewOpen" />
    <WarmHubUploadDialog v-if="store.uploadDialogOpen" v-model:visible="store.uploadDialogOpen" />
    <WarmPdfImportDialog v-if="store.pdfImportDialogOpen" v-model:visible="store.pdfImportDialogOpen" />
    <WarmCustomerProductMaintenanceDialog v-if="store.maintenanceOpen" v-model:visible="store.maintenanceOpen" />
    <WarmCreateProductArchiveDialog v-if="store.createProductArchiveDialogOpen" v-model:visible="store.createProductArchiveDialogOpen" />
    <WarmDrawingTrashDialog v-if="store.drawingTrashDialogOpen" v-model:visible="store.drawingTrashDialogOpen" />
    <WarmNetworkDiagnosticsDialog v-if="networkDiagnosticsOpen" v-model:visible="networkDiagnosticsOpen" />
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
  --order-column-width: 282px;
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
  transform: rotate(9deg);
}

.hub-body {
  display: grid;
  grid-template-columns: var(--order-column-width) minmax(0, 1fr);
  width: 100%;
  min-height: 0;
  gap: 11px;
  contain: layout paint style;
  transform: translateZ(0);
  overflow: hidden;
}

.hub-body > * {
  min-width: 0;
}

.document-hub-shell.orders-collapsed {
  --order-column-width: 64px;
}

@media (max-width: 1320px) {
  .document-hub-shell {
    --order-column-width: 272px;
    padding: 9px;
  }

  .document-hub-shell.orders-collapsed {
    --order-column-width: 60px;
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
