<script setup lang="ts">
import WarmDrawingModuleCard from './WarmDrawingModuleCard.vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { DrawingModule } from '@/types/production'

const store = useDocumentHubStore()

function upload(module: DrawingModule) {
  store.selectedModule = module
  store.uploadDialogOpen = true
}
</script>

<template>
  <div class="product-home" data-scroll-key="product">
    <section v-if="store.productDrawingDetail" class="product-hero">
      <div>
        <p>{{ store.productDrawingDetail.customer?.customerName || '待补充客户资料' }}</p>
        <h2>{{ store.productDrawingDetail.product.productModel }}</h2>
        <span>{{ store.productDrawingDetail.product.productName }}</span>
      </div>
      <b>{{ store.productDrawingDetail.product.drawingStatus === 'no_drawing' ? '未发图 / 待上传资料' : '产品资料包' }}</b>
    </section>
    <div class="module-grid">
      <WarmDrawingModuleCard
        v-for="module in store.productDrawingDetail?.modules"
        :key="module.moduleKey"
        :module="module"
        @open="store.openModule"
        @upload="upload"
      />
    </div>
  </div>
</template>

<style scoped>
.product-home {
  height: calc(100% - 58px);
  overflow: auto;
}

.product-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(145deg, #fff7ea, #ffd79d);
  box-shadow: 0 14px 24px rgba(80, 42, 16, 0.12);
}

p,
h2,
span {
  margin: 0;
}

p {
  color: #9b5125;
  font-size: 13px;
  font-weight: 950;
}

h2 {
  margin-top: 3px;
  color: #342112;
  font-size: 30px;
  font-weight: 950;
}

span {
  display: block;
  margin-top: 4px;
  color: #73512c;
  font-weight: 850;
}

b {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 250, 240, 0.78);
  color: #7a421f;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 1320px) {
  .module-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
