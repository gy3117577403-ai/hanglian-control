<script setup lang="ts">
import { ChevronLeft, UploadCloud } from 'lucide-vue-next'
import WarmDrawingModuleCard from './WarmDrawingModuleCard.vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()

function statusText(status?: string) {
  if (status === 'available') return '已有图纸'
  if (status === 'partial') return '部分资料'
  return '未发图'
}
</script>

<template>
  <div class="product-home" data-scroll-key="product">
    <section v-if="store.productDrawingDetail" class="product-hero">
      <PrimeButton severity="secondary" outlined rounded title="返回" @click="store.goBack()">
        <ChevronLeft :size="20" />
      </PrimeButton>
      <div class="hero-main">
        <p>{{ store.productDrawingDetail.customer?.customerName || '待补充客户资料' }}</p>
        <h2>{{ store.productDrawingDetail.product.productModel }}</h2>
        <span>{{ store.productDrawingDetail.product.productName }}</span>
      </div>
      <b :class="store.productDrawingDetail.product.drawingStatus">
        {{ statusText(store.productDrawingDetail.product.drawingStatus) }}
      </b>
      <PrimeButton class="hero-upload" @click="store.openTopUpload()">
        <UploadCloud :size="18" />
        <span>上传资料</span>
      </PrimeButton>
    </section>
    <div class="module-grid">
      <WarmDrawingModuleCard
        v-for="module in store.productDrawingDetail?.modules"
        :key="module.moduleKey"
        :module="module"
        @open="store.openModule"
        @upload="store.openModuleUpload"
      />
    </div>
  </div>
</template>

<style scoped>
.product-home {
  height: calc(100% - 58px);
  overflow: auto;
  padding-right: 2px;
}

.product-hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
  padding: 13px;
  border-radius: 18px;
  background: linear-gradient(145deg, #fff7ea, #ffd79d);
  box-shadow: 0 14px 24px rgba(80, 42, 16, 0.12);
}

.hero-main {
  min-width: 0;
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
  overflow: hidden;
  margin-top: 3px;
  color: #342112;
  font-size: 28px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

span {
  display: block;
  overflow: hidden;
  margin-top: 3px;
  color: #73512c;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

b {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 250, 240, 0.78);
  color: #7a421f;
  white-space: nowrap;
}

b.available {
  color: #3e783a;
}

b.partial {
  color: #a34f1f;
}

b.no_drawing {
  color: #9b3d32;
}

.hero-upload {
  border-color: rgba(143, 63, 29, 0.18);
  background: linear-gradient(145deg, #e38435, #bf531f);
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
</style>
