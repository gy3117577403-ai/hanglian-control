<script setup lang="ts">
import { computed } from 'vue'
import { FileUp, FolderOpen, Pencil, Plus, RefreshCw, Search } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { MaintenanceProductRow } from '@/types/customer-product-maintenance'

const store = useDocumentHubStore()

defineEmits<{
  create: []
  edit: [product: MaintenanceProductRow]
}>()

const selectedCustomer = computed(() => store.maintenanceSelectedCustomer)
const disabledCustomer = computed(() => selectedCustomer.value?.status === 'disabled')

const statusText: Record<string, string> = {
  available: '已有图纸',
  partial: '资料不完整',
  no_drawing: '未发图',
}

const sourceText: Record<string, string> = {
  pdf_import: 'PDF 导入',
  manual_create: '手工创建',
  future_wecom: '微盘待接入',
  seed: '演示数据',
}

function formatDate(value?: string) {
  if (!value) return '暂无更新'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '暂无更新'
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

function reloadProducts() {
  void store.loadMaintenanceProducts()
}

function openProduct(product: MaintenanceProductRow) {
  void store.openProductFromMaintenance(product)
}

function importPdf() {
  store.openPdfImportFromMaintenance()
}

function completenessText(product: MaintenanceProductRow) {
  const summary = product.maintenanceSummary
  if (!summary.moduleCount) return '模块待刷新'
  return `已完成 ${summary.uploadedModuleCount} / ${summary.moduleCount}`
}
</script>

<template>
  <section class="maintenance-product-panel">
    <header class="panel-heading">
      <div class="heading-title">
        <FolderOpen :size="21" />
        <div>
          <h3 :title="selectedCustomer?.customerName">{{ selectedCustomer?.customerName || '请选择客户' }}</h3>
          <p>{{ store.maintenanceProducts.length }} 个产品型号</p>
        </div>
      </div>
      <div class="heading-actions">
        <PrimeButton class="icon-button" severity="secondary" outlined title="刷新产品" aria-label="刷新产品" :disabled="!selectedCustomer || store.maintenanceLoading" @click="reloadProducts">
          <RefreshCw :size="17" />
        </PrimeButton>
        <PrimeButton class="import-button" severity="secondary" outlined :disabled="!selectedCustomer || disabledCustomer" @click="importPdf">
          <FileUp :size="17" />
          <span>导入 PDF 图纸</span>
        </PrimeButton>
        <PrimeButton class="create-button" :disabled="!selectedCustomer || disabledCustomer" @click="$emit('create')">
          <Plus :size="17" />
          <span>新建产品</span>
        </PrimeButton>
      </div>
    </header>

    <PrimeMessage v-if="disabledCustomer" severity="warn" :closable="false" class="customer-warning">
      当前客户已停用，启用后才能新增产品或导入图纸。
    </PrimeMessage>

    <div class="search-line">
      <Search :size="17" />
      <input
        v-model="store.maintenanceProductSearch"
        type="search"
        placeholder="搜索型号、标准化型号、名称、关键词、备注"
        :disabled="!selectedCustomer"
        @keyup.enter="reloadProducts"
      >
    </div>

    <div class="product-list" data-scroll-key="maintenance-products">
      <article v-for="product in store.maintenanceProducts" :key="product.productId" class="product-card">
        <header class="product-card__header">
          <div class="product-title">
            <strong :title="product.productModel">{{ product.productModel }}</strong>
            <span :title="product.productName">{{ product.productName || product.productModel }}</span>
          </div>
          <span class="status-pill" :class="product.drawingStatus">{{ statusText[product.drawingStatus] ?? '未发图' }}</span>
        </header>

        <div class="product-card__meta">
          <span>来源：{{ sourceText[product.source || 'manual_create'] ?? '手工创建' }}</span>
          <span>{{ completenessText(product) }}</span>
          <span>原图 {{ product.maintenanceSummary.originalDrawingCount }}</span>
          <span>资料 {{ product.maintenanceSummary.documentCount }}</span>
          <span>{{ formatDate(product.maintenanceSummary.lastDocumentUpdatedAt || product.updatedAt) }}</span>
        </div>

        <div class="module-dots" aria-label="六模块完整度">
          <span
            v-for="module in product.maintenanceSummary.modules"
            :key="module.moduleKey"
            class="module-dot"
            :class="module.status"
            :title="`${module.moduleName}：${module.status === 'uploaded' ? '已完成' : module.itemCount > 0 ? '资料不完整' : '空模块'}`"
          />
          <span v-if="!product.maintenanceSummary.modules.length" class="module-empty">模块待刷新</span>
        </div>

        <p v-if="product.remark" class="product-remark" :title="product.remark">{{ product.remark }}</p>

        <footer class="product-card__actions">
          <PrimeButton class="open-button" severity="secondary" outlined @click="openProduct(product)">
            <FolderOpen :size="17" />
            <span>打开资料页</span>
          </PrimeButton>
          <PrimeButton class="edit-button" severity="secondary" outlined @click="$emit('edit', product)">
            <Pencil :size="17" />
            <span>编辑产品</span>
          </PrimeButton>
          <PrimeButton v-if="product.drawingStatus === 'no_drawing'" class="quick-import-button" severity="secondary" outlined :disabled="disabledCustomer" @click="importPdf">
            <FileUp :size="17" />
            <span>导入原图</span>
          </PrimeButton>
        </footer>
      </article>

      <div v-if="selectedCustomer && !store.maintenanceProducts.length" class="empty-state">
        该客户暂无产品资料。
      </div>
      <div v-if="!selectedCustomer" class="empty-state">
        请先选择左侧客户。
      </div>
    </div>
  </section>
</template>

<style scoped>
.maintenance-product-panel {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 22px;
  background:
    linear-gradient(128deg, rgba(255, 255, 255, 0.66), rgba(255, 255, 255, 0.12) 58%),
    rgba(255, 255, 255, 0.14);
  box-shadow: 0 22px 48px rgba(91, 55, 23, 0.13), inset 0 1px 0 rgba(255, 255, 255, 0.86);
  overflow: hidden;
}

.panel-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.heading-title,
.heading-actions,
.product-card__actions,
.product-card__meta,
.module-dots {
  display: flex;
  align-items: center;
}

.heading-title {
  gap: 9px;
  min-width: 0;
  color: #4b2d15;
}

.heading-title h3 {
  max-width: 100%;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 18px;
  font-weight: 950;
  letter-spacing: 0;
}

.heading-title p {
  margin: 2px 0 0;
  color: rgba(86, 54, 29, 0.68);
  font-size: 12px;
  font-weight: 800;
}

.heading-actions {
  gap: 8px;
}

.icon-button,
.import-button,
.create-button,
.open-button,
.edit-button,
.quick-import-button {
  min-height: 44px;
  border-radius: 15px;
  font-weight: 950;
}

.icon-button {
  width: 44px;
  min-width: 44px;
}

.import-button,
.create-button,
.open-button,
.edit-button,
.quick-import-button {
  gap: 7px;
  padding: 0 12px;
}

.customer-warning {
  margin-top: 10px;
}

.search-line {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin-top: 12px;
  padding: 0 12px;
  border: 1px solid rgba(134, 91, 48, 0.14);
  border-radius: 16px;
  color: #7a4a22;
  background: rgba(255, 255, 255, 0.52);
}

.search-line input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: #3f2916;
  background: transparent;
  font-size: 14px;
  font-weight: 800;
}

.product-list {
  display: grid;
  align-content: start;
  gap: 12px;
  min-height: 0;
  margin-top: 12px;
  padding-right: 4px;
  padding-bottom: 18px;
  overflow-x: hidden;
  overflow-y: auto;
}

.product-card {
  display: grid;
  gap: 10px;
  min-height: 178px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 20px;
  color: #432816;
  background:
    linear-gradient(126deg, rgba(255, 255, 255, 0.84), rgba(236, 246, 241, 0.38) 62%),
    rgba(255, 255, 255, 0.26);
  box-shadow: 0 16px 34px rgba(87, 62, 29, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.product-card__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.product-title {
  min-width: 0;
}

.product-title strong,
.product-title span,
.product-remark {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-title strong {
  font-size: 18px;
  font-weight: 950;
}

.product-title span {
  margin-top: 4px;
  color: rgba(68, 44, 25, 0.68);
  font-size: 13px;
  font-weight: 850;
}

.status-pill {
  min-height: 30px;
  padding: 6px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 950;
  white-space: nowrap;
}

.status-pill.available {
  color: #167064;
  background: rgba(216, 247, 239, 0.88);
}

.status-pill.partial {
  color: #8b5a1f;
  background: rgba(252, 235, 203, 0.9);
}

.status-pill.no_drawing {
  color: #9a4e1e;
  background: rgba(255, 229, 209, 0.9);
}

.product-card__meta {
  gap: 7px;
  flex-wrap: wrap;
}

.product-card__meta span {
  min-height: 28px;
  padding: 5px 9px;
  border-radius: 999px;
  color: #5f4020;
  background: rgba(255, 255, 255, 0.56);
  font-size: 12px;
  font-weight: 850;
}

.module-dots {
  gap: 7px;
  min-height: 22px;
}

.module-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: rgba(140, 112, 82, 0.28);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.module-dot.uploaded {
  background: #3f9b89;
}

.module-dot.pending {
  background: #d69748;
}

.module-dot.no_drawing {
  background: #c9b49d;
}

.module-empty {
  color: rgba(75, 48, 27, 0.58);
  font-size: 12px;
  font-weight: 850;
}

.product-remark {
  margin: 0;
  color: rgba(68, 44, 25, 0.66);
  font-size: 13px;
  font-weight: 800;
}

.product-card__actions {
  gap: 8px;
  flex-wrap: wrap;
}

.empty-state {
  display: grid;
  min-height: 220px;
  place-items: center;
  color: rgba(75, 48, 27, 0.56);
  font-size: 15px;
  font-weight: 850;
}

@media (max-width: 1120px) {
  .panel-heading {
    grid-template-columns: minmax(0, 1fr);
  }

  .heading-actions {
    flex-wrap: wrap;
  }
}
</style>
