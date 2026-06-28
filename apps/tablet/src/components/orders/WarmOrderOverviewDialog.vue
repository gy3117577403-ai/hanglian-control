<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import WarmOrderOverviewList from './WarmOrderOverviewList.vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { OrderCompletionFilter, OrderProductionStatus, OrderScope, ProductionOrder } from '@/types/order-management'

const store = useDocumentHubStore()
const confirm = useConfirm()
const scope = ref<OrderScope>('week')
const completion = ref<OrderCompletionFilter>('all')
const productionStatus = ref<OrderProductionStatus | 'all'>('all')
const keyword = ref('')

const scopeOptions: Array<{ label: string; value: OrderScope }> = [
  { label: '今日', value: 'today' },
  { label: '本周', value: 'week' },
]
const completionOptions: Array<{ label: string; value: OrderCompletionFilter }> = [
  { label: '全部', value: 'all' },
  { label: '待完成', value: 'pending' },
  { label: '已完成', value: 'completed' },
]
const statusOptions: Array<{ label: string; value: OrderProductionStatus | 'all' }> = [
  { label: '全部状态', value: 'all' },
  { label: '在前端', value: 'front' },
  { label: '在后端', value: 'back' },
  { label: '未发图', value: 'no_drawing' },
]

const overview = computed(() => store.orderOverview)
const allOverviewOrders = computed(() => {
  const pending = overview.value?.pendingOrders ?? []
  const completed = overview.value?.completedOrders ?? []
  const map = new Map<string, ProductionOrder>()
  for (const order of [...pending, ...completed]) map.set(order.orderId, order)
  return [...map.values()]
})
const filteredRows = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return allOverviewOrders.value.filter((order) => {
    if (order.scope !== scope.value) return false
    if (completion.value !== 'all' && order.completionStatus !== completion.value) return false
    if (productionStatus.value !== 'all' && order.productionStatus !== productionStatus.value) return false
    if (!q) return true
    return [order.productModel, order.customerName, order.remark].some((value) => String(value ?? '').toLowerCase().includes(q))
  })
})

watch(() => store.orderOverviewOpen, (open) => {
  if (open) void store.loadOrderOverview()
})

function scopeOverview(value: 'today' | 'week') {
  return overview.value?.[value] ?? {
    total: 0,
    pending: 0,
    completed: 0,
    front: 0,
    back: 0,
    noDrawing: 0,
    items: [],
  }
}

function open(order: ProductionOrder) {
  store.saveCurrentScroll('order-overview')
  void store.openOrderProduct(order, 'overview')
  store.orderOverviewOpen = false
}

function confirmComplete(order: ProductionOrder) {
  confirm.require({
    header: '确认完成订单',
    message: '完成后该型号将从当前待完成列表移除，并进入订单总览的已完成列表。',
    acceptLabel: '确认完成',
    rejectLabel: '取消',
    acceptClass: 'p-button-success',
    accept: () => {
      void store.completeOrder(order)
    },
  })
}

function confirmRestore(order: ProductionOrder) {
  confirm.require({
    header: '恢复订单',
    message: '订单将重新回到原来的今日或本周待完成列表，是否继续？',
    acceptLabel: '确认恢复',
    rejectLabel: '取消',
    accept: () => {
      void store.restoreOrder(order)
    },
  })
}
</script>

<template>
  <PrimeDialog v-model:visible="store.orderOverviewOpen" modal header="订单总览" :style="{ width: '94vw', maxWidth: '1280px' }">
    <section class="overview-dialog">
      <div class="overview-stats">
        <article v-for="item in scopeOptions" :key="item.value" class="stat-card">
          <b>{{ item.label }}</b>
          <span>总数 {{ scopeOverview(item.value).total }}</span>
          <span>待完成 {{ scopeOverview(item.value).pending }}</span>
          <span>已完成 {{ scopeOverview(item.value).completed }}</span>
          <em>在前端 {{ scopeOverview(item.value).front }}</em>
          <em>在后端 {{ scopeOverview(item.value).back }}</em>
          <em>未发图 {{ scopeOverview(item.value).noDrawing }}</em>
        </article>
      </div>

      <div class="overview-filters">
        <div class="segmented">
          <button v-for="option in scopeOptions" :key="option.value" type="button" :class="{ active: scope === option.value }" @click="scope = option.value">
            {{ option.label }}
          </button>
        </div>
        <div class="segmented">
          <button v-for="option in completionOptions" :key="option.value" type="button" :class="{ active: completion === option.value }" @click="completion = option.value">
            {{ option.label }}
          </button>
        </div>
        <div class="segmented status">
          <button v-for="option in statusOptions" :key="option.value" type="button" :class="{ active: productionStatus === option.value }" @click="productionStatus = option.value">
            {{ option.label }}
          </button>
        </div>
        <PrimeInputText v-model="keyword" placeholder="搜索产品型号" />
      </div>

      <p v-if="store.orderOverviewError" class="overview-error">
        {{ store.orderOverviewError }}
        <PrimeButton size="small" severity="secondary" label="重试" @click="store.loadOrderOverview()" />
      </p>

      <PrimeSkeleton v-if="store.orderOverviewLoading && !filteredRows.length" height="220px" border-radius="16px" />
      <WarmOrderOverviewList
        v-else
        :orders="filteredRows"
        :action-loading-id="store.orderActionLoadingId"
        @open="open"
        @complete="confirmComplete"
        @restore="confirmRestore"
        @link="store.openOrderProductLinkDialog"
        @status-change="store.updateOrderStatus"
      />
    </section>
  </PrimeDialog>
</template>

<style scoped>
.overview-dialog {
  display: grid;
  gap: 12px;
  max-height: 78vh;
  overflow: hidden;
}

.overview-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.stat-card {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.34);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.74);
}

.stat-card b {
  grid-column: 1 / -1;
  color: #342112;
  font-size: 15px;
  font-weight: 950;
}

.stat-card span,
.stat-card em {
  display: grid;
  place-items: center;
  min-height: 34px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.44);
  color: #7d542b;
  font-size: 12px;
  font-style: normal;
  font-weight: 900;
}

.overview-filters {
  display: grid;
  grid-template-columns: 156px 236px minmax(300px, 1fr) minmax(160px, 0.65fr);
  gap: 8px;
  align-items: center;
}

.segmented {
  display: grid;
  grid-auto-flow: column;
  gap: 4px;
  min-width: 0;
  padding: 4px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.28);
}

.segmented button {
  min-height: 40px;
  min-width: 0;
  padding: 0 10px;
  border: 0;
  border-radius: 11px;
  background: transparent;
  color: #68401f;
  font-size: 12px;
  font-weight: 950;
  cursor: pointer;
}

.segmented button.active {
  color: #fff8ec;
  background:
    linear-gradient(145deg, rgba(206, 105, 42, 0.82), rgba(151, 75, 35, 0.72)),
    rgba(255, 255, 255, 0.18);
}

.overview-filters :deep(.p-inputtext) {
  min-height: 48px;
  border-radius: 14px;
  font-weight: 900;
}

.overview-error {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  margin: 0;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(174, 71, 60, 0.1);
  color: #9b3d32;
  font-size: 13px;
  font-weight: 900;
}

@media (max-width: 1200px) {
  .overview-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
