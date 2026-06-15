<script setup lang="ts">
import { ChevronLeft } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
</script>

<template>
  <div class="drawing-breadcrumb">
    <PrimeButton v-if="store.drawingViewLevel !== 'customers'" severity="secondary" outlined @click="store.goBack()">
      <ChevronLeft :size="18" />
      <span>返回上一级</span>
    </PrimeButton>
    <div class="crumbs">
      <span>图纸库</span>
      <b v-if="store.selectedCustomer">/ {{ store.selectedCustomer.customerShortName }}</b>
      <b v-if="store.selectedProduct">/ {{ store.selectedProduct.productModel }}</b>
      <b v-if="store.selectedModule">/ {{ store.selectedModule.moduleName }}</b>
    </div>
  </div>
</template>

<style scoped>
.drawing-breadcrumb {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  margin-bottom: 10px;
}

.crumbs {
  overflow: hidden;
  color: #8a5528;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.crumbs span {
  color: #3d2815;
}
</style>
