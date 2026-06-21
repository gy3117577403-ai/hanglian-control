<script setup lang="ts">
import { computed } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { CalendarDays, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-vue-next'
import WarmOrderCard from './WarmOrderCard.vue'
import { createWarmAsyncComponent } from '@/lib/async-components'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { OrderProductionStatus, OrderScope, ProductionOrder } from '@/types/order-management'

const store = useDocumentHubStore()
const confirm = useConfirm()
const customerToneNames = ['tone-amber', 'tone-teal', 'tone-sage', 'tone-rose', 'tone-violet', 'tone-gold']
const WarmOrderImportDialog = createWarmAsyncComponent(() => import('./WarmOrderImportDialog.vue'), {
  name: 'WarmOrderImportDialog',
  label: '正在加载订单导入...',
})
const WarmOrderProductLinkDialog = createWarmAsyncComponent(() => import('./WarmOrderProductLinkDialog.vue'), {
  name: 'WarmOrderProductLinkDialog',
  label: '正在加载产品匹配...',
})

const activeOrders = computed(() => store.visibleActiveScopeOrders)
const todayCount = computed(() => store.visibleTodayOrders.length)
const weekCount = computed(() => store.visibleWeekOrders.length)
const activeScrollKey = computed(() => `orders-${store.activeOrderScope}`)
let lastTogglePointerAt = -1000

function recentlyHandledPointer() {
  return lastTogglePointerAt > 0 && performance.now() - lastTogglePointerAt < 350
}

function markPointerAction() {
  lastTogglePointerAt = performance.now()
}

function toggleSidebar() {
  store.toggleOrderSidebar()
}

function handleTogglePointerdown() {
  markPointerAction()
  toggleSidebar()
}

function handleToggleClick() {
  if (recentlyHandledPointer()) return
  toggleSidebar()
}

const customerToneMap = computed(() => {
  const map = new Map<string, string>()
  for (const order of activeOrders.value) {
    const key = order.customerName || '客户待确认'
    if (!map.has(key)) {
      map.set(key, customerToneNames[map.size % customerToneNames.length])
    }
  }
  return map
})

function setScope(scope: OrderScope) {
  store.setActiveOrderScope(scope)
}

function open(order: ProductionOrder) {
  void store.openOrderProduct(order, 'orders')
}

function openLink(order: ProductionOrder) {
  void store.openOrderProductLinkDialog(order)
}

function customerTone(customerName: string) {
  return customerToneMap.value.get(customerName || '客户待确认') ?? 'tone-neutral'
}

function customerCount(orders: ProductionOrder[]) {
  return new Set(orders.map((order) => order.customerName || '客户待确认')).size
}

function quantitySummary(orders: ProductionOrder[]) {
  const provided = orders.filter((order) => order.quantityProvided)
  const sum = provided.reduce((total, order) => total + (Number(order.quantity) > 0 ? Number(order.quantity) : 0), 0)
  return provided.length === orders.length ? `数量 ${sum}` : `数量 ${sum} / 未填 ${orders.length - provided.length}`
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

function changeStatus(order: ProductionOrder, status: OrderProductionStatus) {
  void store.updateOrderStatus(order, status)
}

function openImport() {
  store.openOrderImport(store.activeOrderScope)
}
</script>

<template>
  <aside class="order-sidebar" :class="{ collapsed: store.orderSidebarCollapsed }" data-scroll-key="orders">
    <button
      class="collapsed-rail"
      type="button"
      title="展开订单"
      :aria-hidden="!store.orderSidebarCollapsed"
      :tabindex="store.orderSidebarCollapsed ? 0 : -1"
      @pointerdown.prevent.stop="handleTogglePointerdown"
      @click="handleToggleClick"
    >
      <ChevronRight :size="19" />
      <span>订单</span>
      <b>{{ activeOrders.length }}</b>
      <small>{{ store.activeOrderScope === 'today' ? '今日' : '本周' }}</small>
    </button>

    <div class="expanded-panel" :aria-hidden="store.orderSidebarCollapsed">
      <div class="sidebar-head">
        <div class="head-row">
          <div class="head-title">
            <CalendarDays :size="19" />
            <div class="title-copy">
              <h2>订单资料调用</h2>
            </div>
          </div>
          <PrimeButton
            class="collapse-button"
            severity="secondary"
            text
            rounded
            title="收起订单栏"
            @pointerdown.prevent.stop="handleTogglePointerdown"
            @click="handleToggleClick"
          >
            <ChevronLeft :size="18" />
          </PrimeButton>
        </div>
        <div class="subtitle-row">
          <p class="sidebar-subtitle">点型号直接打开图纸资料</p>
          <PrimeButton class="import-button" title="导入订单" aria-label="导入订单" @click="openImport">
            <FileSpreadsheet :size="15" />
            <span>导入订单</span>
          </PrimeButton>
        </div>
      </div>

      <div class="scope-tabs" role="tablist" aria-label="订单范围">
        <button type="button" :class="{ active: store.activeOrderScope === 'today' }" @click="setScope('today')">
          今日订单 <b>{{ todayCount }}</b>
        </button>
        <button type="button" :class="{ active: store.activeOrderScope === 'week' }" @click="setScope('week')">
          本周订单 <b>{{ weekCount }}</b>
        </button>
      </div>

      <section class="order-section" :class="store.activeOrderScope">
        <div class="section-title">
          <b>{{ store.activeOrderScope === 'today' ? '今日订单' : '本周订单' }}</b>
          <span>客户 {{ customerCount(activeOrders) }}</span>
          <em>{{ quantitySummary(activeOrders) }}</em>
        </div>

        <div v-if="store.ordersError" class="order-error">
          <span>{{ store.ordersError }}</span>
          <PrimeButton size="small" severity="secondary" label="重试" @click="store.loadOrders(store.activeOrderScope)" />
        </div>

        <div class="order-list compact-scroll" :data-scroll-key="activeScrollKey">
          <template v-if="store.ordersLoading && !activeOrders.length">
            <PrimeSkeleton v-for="index in 3" :key="index" height="132px" border-radius="15px" />
          </template>
          <WarmOrderCard
            v-for="order in activeOrders"
            :key="order.orderId"
            :order="order"
            :loading="store.orderActionLoadingId === order.orderId"
            :customer-tone="customerTone(order.customerName)"
            @open="open"
            @complete="confirmComplete"
            @link="openLink"
            @status-change="changeStatus"
          />
          <div v-if="!store.ordersLoading && !activeOrders.length" class="empty-orders">
            {{ store.activeOrderScope === 'today' ? '今日暂无待完成订单。' : '本周暂无待完成订单。' }}
          </div>
        </div>
      </section>
    </div>

    <WarmOrderImportDialog v-if="store.orderImportOpen" />
    <WarmOrderProductLinkDialog v-if="store.pendingProductLinkOrder" />
  </aside>
</template>

<style scoped>
.order-sidebar {
  position: relative;
  isolation: isolate;
  display: grid;
  box-sizing: border-box;
  flex-shrink: 0;
  inline-size: 100%;
  min-width: 0;
  max-width: 100%;
  min-height: 0;
  overflow: hidden;
  contain: layout paint style;
  z-index: 6;
  width: 100%;
  padding: 9px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 24px;
  background:
    linear-gradient(122deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.9) 34%, rgba(255, 255, 255, 0.78) 62%),
    linear-gradient(300deg, rgba(93, 143, 138, 0.22), rgba(93, 143, 138, 0.08) 52%, transparent 68%),
    rgba(255, 251, 241, 0.99);
  box-shadow:
    0 18px 34px rgba(75, 38, 13, 0.12),
    0 8px 18px rgba(255, 255, 255, 0.22) inset,
    0 0 0 1px rgba(126, 78, 36, 0.05),
    0 2px 0 rgba(255, 255, 255, 0.96) inset,
    16px 0 28px rgba(255, 255, 255, 0.24) inset,
    -14px -12px 32px rgba(86, 130, 124, 0.1) inset;
  transform: translateZ(0);
  backface-visibility: hidden;
  word-break: keep-all;
  overflow-wrap: normal;
}

.order-sidebar::before {
  position: absolute;
  inset: 1px;
  z-index: -1;
  border-radius: 23px;
  background:
    linear-gradient(130deg, rgba(255, 255, 255, 0.99), rgba(255, 255, 255, 0.92) 32%, rgba(255, 255, 255, 0.82) 56%),
    linear-gradient(300deg, rgba(86, 132, 126, 0.18), transparent 50%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.22), transparent 18%, transparent 82%, rgba(100, 61, 29, 0.07));
  content: '';
  pointer-events: none;
}

.collapsed-rail,
.expanded-panel {
  grid-area: 1 / 1;
  min-width: 0;
  min-height: 0;
  transition:
    opacity 120ms ease,
    transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1),
    visibility 120ms step-end;
}

.expanded-panel {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  min-width: 0;
  opacity: 1;
  transform: translateX(0) scale(1);
  visibility: visible;
}

.order-sidebar.collapsed .expanded-panel {
  opacity: 0;
  transform: translateX(-8px) scale(0.98);
  visibility: hidden;
  pointer-events: none;
}

.order-sidebar.collapsed {
  width: 100%;
  padding: 6px;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  pointer-events: none;
}

.order-sidebar.collapsed::before {
  opacity: 0;
}

.sidebar-head {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto auto;
  gap: 8px;
  align-items: start;
  min-width: 0;
  min-height: 84px;
  max-height: 96px;
  margin-bottom: 8px;
  color: #9b5125;
}

.head-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.head-title {
  display: inline-grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 7px;
  align-items: center;
  min-width: 0;
  white-space: nowrap;
}

.title-copy {
  min-width: 0;
}

.sidebar-head h2,
.sidebar-head p {
  margin: 0;
}

.sidebar-head h2 {
  overflow: hidden;
  color: #332111;
  font-size: 16px;
  font-weight: 950;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: keep-all;
  overflow-wrap: normal;
}

.sidebar-subtitle {
  display: -webkit-box;
  overflow: hidden;
  color: #7d542b;
  font-size: 11px;
  font-weight: 850;
  line-height: 1.35;
  word-break: keep-all;
  overflow-wrap: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.subtitle-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.collapse-button {
  flex-shrink: 0;
  align-self: start;
  width: 36px;
  min-width: 36px;
  height: 36px;
}

.import-button {
  justify-content: center;
  width: 104px;
  min-width: 96px;
  max-width: 112px;
  min-height: 38px;
  max-height: 42px;
  gap: 5px;
  border-radius: 12px;
  color: #8f4a22;
  font-size: 12px;
  font-weight: 950;
  background:
    linear-gradient(125deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.16) 54%),
    rgba(255, 248, 238, 0.62);
  border: 1px solid rgba(216, 137, 53, 0.28);
  box-shadow:
    0 8px 14px rgba(141, 68, 22, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.78),
    inset 0 -7px 12px rgba(207, 117, 42, 0.08);
}

.import-button span {
  white-space: nowrap;
  word-break: keep-all;
}

.scope-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 7px;
}

.scope-tabs button {
  min-height: 40px;
  max-height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.34);
  color: #68401f;
  font-weight: 950;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
}

.scope-tabs button.active {
  color: #fff8ec;
  background:
    linear-gradient(145deg, rgba(205, 105, 40, 0.84), rgba(151, 75, 35, 0.72)),
    rgba(255, 255, 255, 0.2);
  box-shadow:
    0 12px 20px rgba(128, 62, 22, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.48);
}

.scope-tabs b {
  margin-left: 4px;
}

.order-section {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  min-height: 0;
  padding: 7px 3px 0;
  border-top: 1px solid rgba(88, 122, 118, 0.18);
  border-radius: 17px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.025)),
    rgba(255, 255, 255, 0.02);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    inset 0 -12px 22px rgba(120, 67, 32, 0.028);
}

.section-title {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 5px;
  align-items: center;
  margin-bottom: 6px;
  color: #4a2d16;
  min-width: 0;
}

.section-title b {
  overflow: hidden;
  font-size: 14px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-title span,
.section-title em {
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.52);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
  color: #8b5528;
  font-size: 11px;
  font-weight: 950;
  font-style: normal;
  text-align: center;
  white-space: nowrap;
}

.section-title em {
  justify-self: end;
}

.order-error {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
  padding: 8px;
  border-radius: 13px;
  background: rgba(174, 71, 60, 0.1);
  color: #9b3d32;
  font-size: 11px;
  font-weight: 850;
}

.order-list {
  display: grid;
  flex: 1;
  align-content: start;
  gap: 12px;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding-right: 3px;
  padding-bottom: 24px;
  scrollbar-gutter: stable;
  -webkit-overflow-scrolling: touch;
}

.order-list::-webkit-scrollbar {
  width: 6px;
}

.order-list::-webkit-scrollbar-track {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
}

.order-list::-webkit-scrollbar-thumb {
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.48), rgba(255, 255, 255, 0.12)),
    rgba(129, 84, 40, 0.42);
}

.compact-scroll {
  max-height: 100%;
}

.empty-orders {
  display: grid;
  place-items: center;
  min-height: 92px;
  padding: 10px;
  border: 1px dashed rgba(139, 90, 42, 0.18);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.2);
  color: #8a6239;
  font-size: 12px;
  font-weight: 850;
  line-height: 1.45;
  text-align: center;
}

.collapsed-rail {
  opacity: 0;
  transform: translateX(-6px) scale(0.96);
  display: grid;
  box-sizing: border-box;
  gap: 8px;
  place-items: center;
  contain: layout paint style;
  width: 100%;
  height: 100%;
  min-height: 0;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 18px;
  background:
    linear-gradient(128deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.08) 52%),
    linear-gradient(302deg, rgba(95, 142, 136, 0.1), transparent 56%),
    rgba(255, 255, 255, 0.34);
  color: #6a391b;
  cursor: pointer;
  box-shadow:
    0 18px 34px rgba(75, 38, 13, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.96),
    inset 0 -18px 34px rgba(116, 62, 30, 0.06);
  pointer-events: none;
}

.order-sidebar.collapsed .collapsed-rail {
  opacity: 1;
  transform: translateX(0) scale(1);
  pointer-events: auto;
}

.collapsed-rail:active,
.sidebar-head :deep(.p-button:active) {
  transform: translateY(1px) scale(0.98);
}

.collapsed-rail span {
  display: none;
  color: #4a2d16;
  font-size: 13px;
  font-weight: 950;
  letter-spacing: 0;
}

.collapsed-rail b,
.collapsed-rail small {
  display: grid;
  place-items: center;
  min-width: 30px;
  min-height: 30px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #a34f1f;
  font-weight: 950;
}

.collapsed-rail small {
  display: none;
  min-width: 0;
  min-height: 0;
  padding: 5px 4px;
  color: #6f4a28;
  font-size: 10px;
}

@media (max-width: 1320px), (prefers-reduced-motion: reduce) {
  .collapsed-rail,
  .expanded-panel {
    transition: none;
  }
}
</style>
