<script setup lang="ts">
import { computed } from 'vue'
import WarmDrawingBreadcrumb from './WarmDrawingBreadcrumb.vue'
import WarmProductDrawingHome from './WarmProductDrawingHome.vue'
import { createWarmAsyncComponent } from '@/lib/async-components'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { DocumentViewerItem } from '@/types/document-viewer'

const store = useDocumentHubStore()
const WarmCustomerGrid = createWarmAsyncComponent(() => import('./WarmCustomerGrid.vue'), { name: 'WarmCustomerGrid' })
const WarmProductModelGrid = createWarmAsyncComponent(() => import('./WarmProductModelGrid.vue'), { name: 'WarmProductModelGrid' })
const WarmDrawingModuleGallery = createWarmAsyncComponent(() => import('./WarmDrawingModuleGallery.vue'), { name: 'WarmDrawingModuleGallery' })
const WarmImageDetailViewer = createWarmAsyncComponent(() => import('./WarmImageDetailViewer.vue'), { name: 'WarmImageDetailViewer' })
const WarmUnarchivedProductPanel = createWarmAsyncComponent(() => import('./WarmUnarchivedProductPanel.vue'), { name: 'WarmUnarchivedProductPanel' })
const WarmDocumentViewer = createWarmAsyncComponent(() => import('@/components/viewer/WarmDocumentViewer.vue'), {
  name: 'WarmDocumentViewer',
  label: '正在加载资料查看器...',
})
const viewerItems = computed<DocumentViewerItem[]>(() => store.selectedModule?.items ?? [])
</script>

<template>
  <div class="drawing-library">
    <WarmDrawingBreadcrumb v-if="store.drawingViewLevel === 'customers' || store.drawingViewLevel === 'products'" />
    <WarmCustomerGrid v-if="store.drawingViewLevel === 'customers'" />
    <WarmProductModelGrid v-else-if="store.drawingViewLevel === 'products'" />
    <WarmUnarchivedProductPanel v-else-if="store.drawingViewLevel === 'unarchived'" />
    <WarmProductDrawingHome v-else-if="store.drawingViewLevel === 'product'" />
    <WarmDrawingModuleGallery v-else-if="store.drawingViewLevel === 'module'" />
    <WarmImageDetailViewer v-else />
    <WarmDocumentViewer
      v-if="store.documentViewerOpen"
      v-model:visible="store.documentViewerOpen"
      :items="viewerItems"
      :initial-item-id="store.documentViewerInitialItemId"
      :module-name="store.selectedModule?.moduleName"
      :product-model="store.selectedProduct?.productModel"
      @close="store.closeDocumentViewer"
    />
  </div>
</template>

<style scoped>
.drawing-library {
  height: 100%;
  padding: 12px;
  overflow: hidden;
}
</style>
