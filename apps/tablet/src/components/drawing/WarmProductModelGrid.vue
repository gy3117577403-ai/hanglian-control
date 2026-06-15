<script setup lang="ts">
import { PackageSearch } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()

function statusText(status: string) {
  if (status === 'available') return '已发图'
  if (status === 'partial') return '部分资料'
  return '未发图 / 待上传资料'
}
</script>

<template>
  <div class="product-grid" data-scroll-key="products">
    <button v-for="product in store.productModels" :key="product.productId" type="button" @click="store.openProduct(product)">
      <PackageSearch :size="24" />
      <b>{{ product.productModel }}</b>
      <span>{{ product.productName }}</span>
      <i :class="product.drawingStatus">{{ statusText(product.drawingStatus) }}</i>
      <small>{{ product.remark }}</small>
    </button>
    <div v-if="!store.productModels.length" class="empty">
      <b>暂无产品型号</b>
      <span>可以先通过顶部上传资料补充产品资料。</span>
    </div>
  </div>
</template>

<style scoped>
.product-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  height: calc(100% - 58px);
  overflow: auto;
}

button,
.empty {
  min-height: 150px;
  padding: 14px;
  border: 1px solid rgba(139, 90, 42, 0.16);
  border-radius: 16px;
  background: rgba(255, 250, 241, 0.9);
  color: #8c4b22;
  text-align: left;
  box-shadow: 0 12px 22px rgba(80, 42, 16, 0.1);
}

b,
span,
i,
small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

b {
  margin-top: 8px;
  color: #342112;
  font-size: 21px;
  font-weight: 950;
}

span,
small {
  margin-top: 4px;
  color: #7b542c;
  font-weight: 850;
}

i {
  width: fit-content;
  margin-top: 10px;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-style: normal;
  font-weight: 950;
}

.available {
  background: rgba(73, 138, 70, 0.14);
  color: #3e783a;
}

.partial {
  background: rgba(220, 115, 38, 0.15);
  color: #a34f1f;
}

.no_drawing {
  background: rgba(160, 75, 64, 0.14);
  color: #9b3d32;
}

.empty {
  display: grid;
  place-items: center;
  grid-column: 1 / -1;
  min-height: 260px;
  text-align: center;
}
</style>
