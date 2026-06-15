<script setup lang="ts">
import { CheckCircle2, FileSearch } from 'lucide-vue-next'
import type { HubOrder } from '@/types/production'

defineProps<{
  order: HubOrder
}>()

const emit = defineEmits<{
  open: [order: HubOrder]
  complete: [order: HubOrder]
}>()

const statusMap = {
  front: { label: '在前端', className: 'front' },
  back: { label: '在后端', className: 'back' },
  no_drawing: { label: '未发图', className: 'no-drawing' },
}
</script>

<template>
  <article class="order-card">
    <div class="order-main">
      <button type="button" class="model-button" @click="emit('open', order)">
        <FileSearch :size="18" />
        <span>{{ order.productModel }}</span>
      </button>
      <p>{{ order.customerName }}</p>
      <small v-if="order.remark">{{ order.remark }}</small>
    </div>
    <div class="order-side">
      <span class="status" :class="statusMap[order.status].className">{{ statusMap[order.status].label }}</span>
      <PrimeButton severity="success" text title="完成订单" @click="emit('complete', order)">
        <CheckCircle2 :size="18" />
        <span>完成</span>
      </PrimeButton>
    </div>
  </article>
</template>

<style scoped>
.order-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-height: 92px;
  padding: 10px;
  border: 1px solid rgba(139, 90, 42, 0.14);
  border-radius: 14px;
  background: linear-gradient(145deg, rgba(255, 252, 245, 0.96), rgba(255, 237, 207, 0.76));
  box-shadow: 0 10px 18px rgba(81, 42, 16, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.model-button {
  display: inline-grid;
  grid-template-columns: auto minmax(0, max-content);
  gap: 6px;
  align-items: center;
  max-width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: #392312;
  font-size: 17px;
  font-weight: 950;
  cursor: pointer;
}

.model-button span,
.order-main p,
.order-main small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-main p,
.order-main small {
  margin: 4px 0 0;
  color: #7d542b;
  font-weight: 850;
}

.order-main small {
  display: block;
  font-size: 11px;
}

.order-side {
  display: grid;
  justify-items: end;
  gap: 8px;
}

.status {
  padding: 5px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 950;
}

.front {
  background: rgba(39, 142, 171, 0.14);
  color: #1f7184;
}

.back {
  background: rgba(220, 115, 38, 0.15);
  color: #a34f1f;
}

.no-drawing {
  background: rgba(160, 75, 64, 0.14);
  color: #9b3d32;
}

.order-side :deep(.p-button) {
  padding: 4px 6px;
  font-weight: 950;
}
</style>
