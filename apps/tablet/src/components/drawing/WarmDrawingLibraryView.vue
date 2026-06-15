<script setup lang="ts">
import WarmCustomerGrid from './WarmCustomerGrid.vue'
import WarmDrawingBreadcrumb from './WarmDrawingBreadcrumb.vue'
import WarmDrawingModuleGallery from './WarmDrawingModuleGallery.vue'
import WarmImageDetailViewer from './WarmImageDetailViewer.vue'
import WarmProductDrawingHome from './WarmProductDrawingHome.vue'
import WarmProductModelGrid from './WarmProductModelGrid.vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
</script>

<template>
  <div class="drawing-library">
    <WarmDrawingBreadcrumb />
    <WarmCustomerGrid v-if="store.drawingViewLevel === 'customers'" />
    <WarmProductModelGrid v-else-if="store.drawingViewLevel === 'products'" />
    <WarmProductDrawingHome v-else-if="store.drawingViewLevel === 'product'" />
    <WarmDrawingModuleGallery v-else-if="store.drawingViewLevel === 'module'" />
    <WarmImageDetailViewer v-else />
  </div>
</template>

<style scoped>
.drawing-library {
  height: 100%;
  padding: 14px;
  overflow: hidden;
}
</style>
