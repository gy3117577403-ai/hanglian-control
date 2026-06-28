<script setup lang="ts">
import { computed } from 'vue'
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { OrderImportPreviewItemState } from '@/types/order-management'

const store = useDocumentHubStore()

const actionMap = {
  create_order: { label: '创建订单', className: 'create' },
  already_active: { label: '进行中订单已存在', className: 'skip' },
  duplicate_in_file: { label: '文件内重复', className: 'skip' },
  needs_customer_confirmation: { label: '需确认客户', className: 'confirm' },
  product_not_found: { label: '未建档，将以未发图导入', className: 'missing' },
  error: { label: '数据错误', className: 'error' },
}

const productionStatusMap = {
  front: '在前端',
  back: '在后端',
  no_drawing: '未发图',
}

const resolutionMap = {
  found: '已匹配产品',
  product_not_found: '产品未建档',
  customer_not_found: '客户未建档',
  ambiguous: '多客户同型号',
  unknown: '待识别',
  resolving: '识别中',
  error: '识别失败',
}

const summary = computed(() => store.orderImportPreview?.summary)

function canSelect(item: OrderImportPreviewItemState) {
  return item.action === 'create_order' || item.action === 'product_not_found' || item.action === 'needs_customer_confirmation'
}

function actionLabel(item: OrderImportPreviewItemState) {
  return actionMap[item.action] ?? actionMap.error
}

function candidates(item: OrderImportPreviewItemState) {
  return store.orderImportCandidateMap[item.importItemId] ?? []
}

function productsForSelectedCustomer(item: OrderImportPreviewItemState) {
  const group = candidates(item).find((candidate) => candidate.customer.customerId === item.confirmedCustomerId)
  return group?.products ?? []
}

function toggleSelected(item: OrderImportPreviewItemState, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  store.updateOrderImportItem(item.importItemId, { selected: canSelect(item) && checked })
}

function updateCustomer(item: OrderImportPreviewItemState, event: Event) {
  store.updateOrderImportItem(item.importItemId, { confirmedCustomerId: (event.target as HTMLSelectElement).value })
}

function updateProduct(item: OrderImportPreviewItemState, event: Event) {
  store.updateOrderImportItem(item.importItemId, { confirmedProductId: (event.target as HTMLSelectElement).value })
}
</script>

<template>
  <section class="preview-panel">
    <div v-if="summary" class="summary-grid">
      <span>将创建 <b>{{ summary.createOrder }}</b></span>
      <span>文件内重复 <b>{{ summary.duplicateInFile }}</b></span>
      <span>已在进行中 <b>{{ summary.alreadyActive }}</b></span>
      <span>需确认客户 <b>{{ summary.needsConfirmation }}</b></span>
      <span>未建档产品 <b>{{ summary.productNotFound }}</b></span>
      <span>错误 <b>{{ summary.error }}</b></span>
    </div>

    <div class="preview-list">
      <article v-for="item in store.orderImportItems" :key="item.importItemId" class="preview-row" :class="actionLabel(item).className">
        <label class="select-cell">
          <input
            type="checkbox"
            :checked="item.selected"
            :disabled="!canSelect(item)"
            @change="toggleSelected(item, $event)"
          >
          <span>{{ item.rowNumber }}</span>
        </label>

        <div class="model-cell">
          <b :title="item.rawProductModel">{{ item.rawProductModel || item.productModel }}</b>
          <small>{{ item.normalizedProductModel }}</small>
        </div>

        <div class="status-cell">
          <span class="action">{{ actionLabel(item).label }}</span>
          <em>{{ resolutionMap[item.productResolutionStatus] }}</em>
          <strong>{{ productionStatusMap[item.recommendedProductionStatus] }}</strong>
        </div>

        <div v-if="item.action === 'needs_customer_confirmation'" class="confirm-cell">
          <PrimeButton
            size="small"
            severity="secondary"
            outlined
            :loading="store.orderImportCandidateLoadingId === item.importItemId"
            @click="store.loadOrderImportItemCandidates(item.importItemId)"
          >
            <RefreshCw :size="14" />
            <span>加载候选</span>
          </PrimeButton>
          <select :value="item.confirmedCustomerId ?? ''" @focus="store.loadOrderImportItemCandidates(item.importItemId)" @change="updateCustomer(item, $event)">
            <option value="">选择客户</option>
            <option v-for="candidate in candidates(item)" :key="candidate.customer.customerId" :value="candidate.customer.customerId">
              {{ candidate.customer.customerName }}
            </option>
          </select>
          <select :value="item.confirmedProductId ?? ''" :disabled="!item.confirmedCustomerId" @change="updateProduct(item, $event)">
            <option value="">选择产品资料页</option>
            <option v-for="product in productsForSelectedCustomer(item)" :key="product.productId" :value="product.productId">
              {{ product.productModel }}
            </option>
          </select>
        </div>
        <div v-else class="message-cell">
          <CheckCircle2 v-if="item.action === 'create_order'" :size="15" />
          <AlertCircle v-else :size="15" />
          <span>{{ item.errorMessage || item.message || actionLabel(item).label }}</span>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.preview-panel {
  display: grid;
  gap: 12px;
  min-height: 0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 7px;
}

.summary-grid span {
  display: grid;
  place-items: center;
  min-height: 50px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.36);
  color: #70421d;
  font-size: 12px;
  font-weight: 900;
  text-align: center;
}

.summary-grid b {
  color: #a34f1f;
  font-size: 16px;
}

.preview-list {
  display: grid;
  gap: 8px;
  max-height: 48vh;
  overflow-y: auto;
  padding-right: 4px;
}

.preview-row {
  display: grid;
  grid-template-columns: 58px minmax(180px, 1.1fr) minmax(170px, 0.9fr) minmax(220px, 1.1fr);
  gap: 8px;
  align-items: center;
  min-height: 78px;
  padding: 9px;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.28);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.preview-row.error {
  background: rgba(174, 71, 60, 0.1);
}

.preview-row.confirm {
  background: rgba(221, 142, 50, 0.12);
}

.select-cell {
  display: grid;
  grid-template-columns: auto auto;
  gap: 7px;
  align-items: center;
  color: #70421d;
  font-weight: 950;
}

.select-cell input {
  width: 20px;
  height: 20px;
  accent-color: #b65d2a;
}

.model-cell,
.status-cell,
.message-cell,
.confirm-cell {
  min-width: 0;
}

.model-cell b,
.model-cell small,
.message-cell span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-cell b {
  color: #342112;
  font-size: 14px;
  font-weight: 950;
}

.model-cell small,
.status-cell em,
.status-cell strong {
  color: #7d542b;
  font-size: 11px;
  font-weight: 850;
  font-style: normal;
}

.status-cell {
  display: grid;
  gap: 4px;
}

.action {
  justify-self: start;
  padding: 4px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.5);
  color: #8f4a22;
  font-size: 11px;
  font-weight: 950;
}

.message-cell {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 5px;
  align-items: center;
  color: #7d542b;
  font-size: 12px;
  font-weight: 850;
}

.confirm-cell {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr);
  gap: 6px;
  align-items: center;
}

.confirm-cell select {
  min-width: 0;
  min-height: 40px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.52);
  color: #593819;
  font-weight: 900;
}

@media (max-width: 1200px) {
  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .preview-row {
    grid-template-columns: 54px minmax(150px, 1fr);
  }

  .status-cell,
  .confirm-cell,
  .message-cell {
    grid-column: 2;
  }
}
</style>
