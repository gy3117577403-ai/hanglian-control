<script setup lang="ts">
import { FileSearch } from 'lucide-vue-next'
import { orderQuantity } from '@/lib/format'
import type { HubOrder } from '@/types/production'

defineProps<{
  order: HubOrder
  customerTone?: string
}>()

const emit = defineEmits<{
  open: [order: HubOrder]
}>()

const statusMap = {
  front: { label: '在前段', className: 'front' },
  back: { label: '在后段', className: 'back' },
  no_drawing: { label: '未发图', className: 'no-drawing' },
  exception: { label: '异常', className: 'exception' },
}
</script>

<template>
  <article class="order-card" :class="customerTone">
    <div class="card-top">
      <button type="button" class="model-button" @click="emit('open', order)">
        <FileSearch :size="17" />
        <span>{{ order.productModel }}</span>
      </button>
      <span class="status" :class="statusMap[order.status].className">{{ statusMap[order.status].label }}</span>
    </div>
    <p class="card-meta">
      <i aria-hidden="true"></i>
      <span>{{ order.customerName }}</span>
      <b>数量 {{ orderQuantity(order) }}</b>
    </p>
  </article>
</template>

<style scoped>
.order-card {
  position: relative;
  isolation: isolate;
  display: grid;
  gap: 5px;
  contain: layout paint style;
  min-height: 58px;
  padding: 7px 8px 7px 10px;
  border: 1px solid rgba(255, 255, 255, 0.92);
  border-radius: 15px;
  background:
    linear-gradient(122deg, rgba(255, 255, 255, 0.68), rgba(255, 255, 255, 0.1) 48%, transparent 68%),
    linear-gradient(310deg, rgba(96, 145, 139, 0.16), rgba(96, 145, 139, 0.03) 56%, transparent),
    rgba(255, 255, 255, 0.06);
  box-shadow:
    0 16px 30px rgba(81, 42, 16, 0.11),
    0 0 0 1px rgba(120, 74, 33, 0.04),
    0 2px 0 rgba(255, 255, 255, 0.96) inset,
    12px 0 24px rgba(255, 255, 255, 0.28) inset,
    -12px -8px 24px rgba(92, 133, 127, 0.08) inset,
    0 -8px 18px rgba(127, 70, 34, 0.018) inset;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
  --customer-accent: #d88935;
  --customer-soft: rgba(216, 137, 53, 0.14);
}

.order-card::before {
  position: absolute;
  inset: 1px;
  z-index: -1;
  border-radius: 14px;
  background:
    linear-gradient(90deg, var(--customer-soft), transparent 34%),
    linear-gradient(124deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.1) 36%, transparent 62%),
    linear-gradient(300deg, rgba(93, 140, 134, 0.12), transparent 48%);
  content: '';
  pointer-events: none;
}

.order-card::after {
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 4px;
  width: 4px;
  border-radius: 999px;
  background: var(--customer-accent);
  box-shadow: 0 0 14px color-mix(in srgb, var(--customer-accent) 46%, transparent);
  content: '';
  pointer-events: none;
}

.order-card:hover {
  border-color: rgba(255, 255, 255, 0.96);
  box-shadow:
    0 18px 34px rgba(81, 42, 16, 0.18),
    0 0 0 1px rgba(120, 74, 33, 0.045),
    0 2px 0 rgba(255, 255, 255, 0.92) inset,
    0 -8px 18px rgba(127, 70, 34, 0.04) inset;
  transform: translateY(-1px);
}

.card-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 50px;
  gap: 7px;
  align-items: center;
  min-width: 0;
}

.model-button {
  display: inline-grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 5px;
  align-items: center;
  min-height: 28px;
  max-width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: #392312;
  font-size: 13px;
  font-weight: 950;
  text-align: left;
  cursor: pointer;
}

.model-button span,
.card-meta span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  gap: 5px;
  align-items: center;
  min-width: 0;
  margin: -2px 0 0 21px;
  color: #7d542b;
  font-size: 10px;
  font-weight: 850;
}

.card-meta i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--customer-accent);
  box-shadow: 0 0 10px color-mix(in srgb, var(--customer-accent) 42%, transparent);
}

.card-meta b {
  flex: none;
  justify-self: end;
  padding: 2px 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.56);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
  color: #8f4a22;
  font-size: 10px;
  white-space: nowrap;
}

.status {
  justify-self: end;
  min-width: 46px;
  padding: 3px 5px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 950;
  text-align: center;
  white-space: nowrap;
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

.exception {
  background: rgba(184, 57, 42, 0.16);
  color: #a83126;
}

.tone-amber {
  --customer-accent: #d88935;
  --customer-soft: rgba(216, 137, 53, 0.18);
}

.tone-teal {
  --customer-accent: #4f9893;
  --customer-soft: rgba(79, 152, 147, 0.18);
}

.tone-sage {
  --customer-accent: #7c9b54;
  --customer-soft: rgba(124, 155, 84, 0.18);
}

.tone-rose {
  --customer-accent: #c26b62;
  --customer-soft: rgba(194, 107, 98, 0.18);
}

.tone-violet {
  --customer-accent: #8f7ab8;
  --customer-soft: rgba(143, 122, 184, 0.18);
}

.tone-gold {
  --customer-accent: #c5a04b;
  --customer-soft: rgba(197, 160, 75, 0.18);
}
</style>
