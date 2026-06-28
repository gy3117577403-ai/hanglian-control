<script setup lang="ts">
import { PackageSearch } from 'lucide-vue-next'
import { mockDrawingDetails } from '@/mock/order-hub-data'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { HubProductModel } from '@/types/production'

const store = useDocumentHubStore()

function statusText(status: string) {
  if (status === 'available') return '已有图纸'
  if (status === 'partial') return '部分资料'
  return '未发图'
}

function moduleSummary(product: HubProductModel) {
  const detail = mockDrawingDetails.find((item) => item.product.productId === product.productId)
  const total = detail?.modules.length ?? 6
  const ready = detail?.modules.filter((module) => module.items.length > 0).length ?? 0
  const updatedAt = detail?.modules.map((module) => module.updatedAt).sort().at(-1)?.slice(0, 10) ?? '待补充'
  return { ready, total, updatedAt }
}
</script>

<template>
  <div class="product-grid" data-scroll-key="products">
    <button v-for="product in store.productModels" :key="product.productId" type="button" @click="store.openProduct(product)">
      <PackageSearch :size="23" />
      <b>{{ product.productModel }}</b>
      <span>{{ product.productName }}</span>
      <div class="meta-line">
        <i :class="product.drawingStatus">{{ statusText(product.drawingStatus) }}</i>
        <i>{{ moduleSummary(product).ready }}/{{ moduleSummary(product).total }} 模块</i>
        <i>{{ moduleSummary(product).updatedAt }}</i>
      </div>
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
  padding-right: 2px;
}

button,
.empty {
  min-height: 142px;
  padding: 14px;
  border: 1px solid rgba(139, 90, 42, 0.16);
  border-radius: 16px;
  background: rgba(255, 250, 241, 0.92);
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
  font-size: 13px;
  font-weight: 850;
}

.meta-line {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 9px;
}

i {
  width: fit-content;
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(255, 246, 230, 0.9);
  color: #724722;
  font-size: 11px;
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
