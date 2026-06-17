<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import WarmDrawingBreadcrumb from './WarmDrawingBreadcrumb.vue'
import WarmProductDrawingHome from './WarmProductDrawingHome.vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
const WarmCustomerGrid = defineAsyncComponent(() => import('./WarmCustomerGrid.vue'))
const WarmProductModelGrid = defineAsyncComponent(() => import('./WarmProductModelGrid.vue'))
const WarmDrawingModuleGallery = defineAsyncComponent(() => import('./WarmDrawingModuleGallery.vue'))
const WarmImageDetailViewer = defineAsyncComponent(() => import('./WarmImageDetailViewer.vue'))
</script>

<template>
  <div class="drawing-library">
    <WarmDrawingBreadcrumb v-if="store.drawingViewLevel === 'customers' || store.drawingViewLevel === 'products'" />
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
  padding: 12px;
  overflow: hidden;
}
</style>
