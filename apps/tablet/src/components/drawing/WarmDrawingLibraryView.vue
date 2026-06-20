<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import WarmDrawingBreadcrumb from './WarmDrawingBreadcrumb.vue'
import WarmProductDrawingHome from './WarmProductDrawingHome.vue'
import WarmDocumentViewer from '@/components/viewer/WarmDocumentViewer.vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { DocumentViewerItem } from '@/types/document-viewer'

const store = useDocumentHubStore()
const WarmCustomerGrid = defineAsyncComponent(() => import('./WarmCustomerGrid.vue'))
const WarmProductModelGrid = defineAsyncComponent(() => import('./WarmProductModelGrid.vue'))
const WarmDrawingModuleGallery = defineAsyncComponent(() => import('./WarmDrawingModuleGallery.vue'))
const WarmImageDetailViewer = defineAsyncComponent(() => import('./WarmImageDetailViewer.vue'))
const WarmUnarchivedProductPanel = defineAsyncComponent(() => import('./WarmUnarchivedProductPanel.vue'))
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
