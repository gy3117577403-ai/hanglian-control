<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, FileText } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { PdfImportAction, PdfImportPreviewItemState } from '@/types/pdf-import'

const store = useDocumentHubStore()

const summary = computed(() => store.pdfImportPreview?.summary)
const selectedCount = computed(() => store.pdfImportItems.filter((item) => item.selected).length)

const summaryCards = computed(() => [
  { label: '文件总数', value: summary.value?.totalFiles ?? 0, tone: 'neutral' },
  { label: '新建产品', value: summary.value?.createProduct ?? 0, tone: 'success' },
  { label: '新增版本', value: summary.value?.addVersion ?? 0, tone: 'info' },
  { label: '重复跳过', value: summary.value?.skipDuplicate ?? 0, tone: 'muted' },
  { label: '需确认', value: summary.value?.needsConfirmation ?? 0, tone: 'warn' },
  { label: '文件错误', value: summary.value?.error ?? 0, tone: 'danger' },
])

function actionLabel(action: PdfImportAction | 'skip') {
  const labels: Record<PdfImportAction | 'skip', string> = {
    create_product: '新建产品',
    add_version: '新增原图版本',
    skip_duplicate: '相同文件，跳过',
    needs_confirmation: '需确认型号',
    error: '文件错误',
    skip: '跳过',
  }
  return labels[action] ?? '待处理'
}

function actionSeverity(action: PdfImportAction | 'skip') {
  if (action === 'create_product') return 'success'
  if (action === 'add_version') return 'info'
  if (action === 'needs_confirmation') return 'warn'
  if (action === 'error') return 'danger'
  return 'secondary'
}

function rowTone(item: PdfImportPreviewItemState) {
  if (item.action === 'create_product') return 'create'
  if (item.action === 'add_version') return 'version'
  if (item.action === 'needs_confirmation') return 'confirm'
  if (item.action === 'error') return 'error'
  return 'duplicate'
}

function canSelect(item: PdfImportPreviewItemState) {
  return item.action !== 'error' && item.action !== 'skip_duplicate' && item.action !== 'skip'
}

function canEditModel(item: PdfImportPreviewItemState) {
  return item.action !== 'error' && item.action !== 'skip_duplicate' && item.action !== 'skip'
}

function showProductName(item: PdfImportPreviewItemState) {
  return item.action === 'create_product'
}

function showEffective(item: PdfImportPreviewItemState) {
  return item.action === 'create_product' || item.action === 'add_version'
}

function updateSelected(item: PdfImportPreviewItemState, checked: boolean) {
  if (!canSelect(item)) return
  store.updatePdfImportItem(item.importItemId, { selected: checked })
}

function updateSelectedFromEvent(item: PdfImportPreviewItemState, event: Event) {
  updateSelected(item, (event.target as HTMLInputElement).checked)
}

function updateText(item: PdfImportPreviewItemState, field: 'confirmedProductModel' | 'confirmedVersion' | 'productName', value: string) {
  store.updatePdfImportItem(item.importItemId, { [field]: value })
}

function updateEffective(item: PdfImportPreviewItemState, checked: boolean) {
  store.updatePdfImportItem(item.importItemId, { setAsEffective: checked })
}

function updateEffectiveFromEvent(item: PdfImportPreviewItemState, event: Event) {
  updateEffective(item, (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <section class="pdf-preview-table" data-pdf-import-preview-table>
    <div class="summary-grid">
      <article v-for="card in summaryCards" :key="card.label" class="summary-card" :class="card.tone">
        <span>{{ card.label }}</span>
        <b>{{ card.value }}</b>
      </article>
    </div>

    <div v-if="store.pdfImportPreview?.status === 'expired'" class="expired-banner">
      <AlertTriangle :size="18" />
      <span>PDF 导入预览已过期，请重新选择文件。</span>
    </div>

    <div class="table-shell">
      <div class="table-heading">
        <div>
          <b>确认信息</b>
          <span>已选择 {{ selectedCount }} 项，确认后将调用真实导入接口。</span>
        </div>
        <PrimeTag :severity="selectedCount ? 'success' : 'warn'" :value="selectedCount ? '已有选择' : '未选择'" />
      </div>

      <PrimeDataTable
        class="pdf-import-data-table"
        :value="store.pdfImportItems"
        data-key="importItemId"
        scrollable
        scroll-height="360px"
        striped-rows
      >
        <PrimeColumn header="导入" style="width: 74px">
          <template #body="{ data }">
            <label class="select-box" :class="{ disabled: !canSelect(data) }">
              <input
                type="checkbox"
                :checked="data.selected"
                :disabled="!canSelect(data)"
                @change="updateSelectedFromEvent(data, $event)"
              >
              <span />
            </label>
          </template>
        </PrimeColumn>

        <PrimeColumn header="PDF 文件" style="min-width: 210px">
          <template #body="{ data }">
            <div class="file-cell">
              <FileText :size="18" />
              <span>{{ data.originalFileName }}</span>
            </div>
          </template>
        </PrimeColumn>

        <PrimeColumn header="识别型号" style="min-width: 150px">
          <template #body="{ data }">
            <span class="muted-text">{{ data.parsedProductModel || '未识别' }}</span>
          </template>
        </PrimeColumn>

        <PrimeColumn header="确认产品型号" style="min-width: 190px">
          <template #body="{ data }">
            <PrimeInputText
              class="model-input"
              :class="{ required: data.needsConfirmation && data.selected && !data.confirmedProductModel }"
              :model-value="data.confirmedProductModel"
              :disabled="!canEditModel(data)"
              placeholder="请输入产品型号"
              @update:model-value="updateText(data, 'confirmedProductModel', String($event ?? ''))"
            />
          </template>
        </PrimeColumn>

        <PrimeColumn header="识别版本" style="min-width: 120px">
          <template #body="{ data }">
            <span class="muted-text">{{ data.parsedVersion || '空白' }}</span>
          </template>
        </PrimeColumn>

        <PrimeColumn header="确认版本" style="min-width: 150px">
          <template #body="{ data }">
            <PrimeInputText
              class="version-input"
              :model-value="data.confirmedVersion ?? ''"
              :disabled="data.action === 'error'"
              placeholder="可选，例如 Rev.A"
              @update:model-value="updateText(data, 'confirmedVersion', String($event ?? ''))"
            />
          </template>
        </PrimeColumn>

        <PrimeColumn header="产品名称" style="min-width: 160px">
          <template #body="{ data }">
            <PrimeInputText
              v-if="showProductName(data)"
              :model-value="data.productName ?? ''"
              placeholder="默认使用产品型号"
              @update:model-value="updateText(data, 'productName', String($event ?? ''))"
            />
            <span v-else class="muted-text">沿用已有产品</span>
          </template>
        </PrimeColumn>

        <PrimeColumn header="当前有效" style="min-width: 118px">
          <template #body="{ data }">
            <label v-if="showEffective(data)" class="effective-box">
              <input
                type="checkbox"
                :checked="data.setAsEffective"
                :disabled="data.action === 'error'"
                @change="updateEffectiveFromEvent(data, $event)"
              >
              <span>设为有效</span>
            </label>
            <span v-else class="muted-text">不适用</span>
          </template>
        </PrimeColumn>

        <PrimeColumn header="处理动作" style="min-width: 140px">
          <template #body="{ data }">
            <PrimeTag :class="`row-tone-${rowTone(data)}`" :severity="actionSeverity(data.action)" :value="actionLabel(data.action)" />
          </template>
        </PrimeColumn>

        <PrimeColumn header="提示信息" style="min-width: 210px">
          <template #body="{ data }">
            <span class="message-text" :class="rowTone(data)">
              {{ data.errorMessage || data.message || (data.parseWarnings?.[0] ?? '已识别') }}
            </span>
          </template>
        </PrimeColumn>
      </PrimeDataTable>
    </div>

    <div class="legend-row">
      <span class="legend create">新建产品</span>
      <span class="legend version">新增版本</span>
      <span class="legend duplicate">重复跳过</span>
      <span class="legend confirm">需确认</span>
      <span class="legend error">文件错误</span>
    </div>
  </section>
</template>

<style scoped>
.pdf-preview-table {
  display: grid;
  gap: 12px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
}

.summary-card {
  min-height: 76px;
  padding: 11px 12px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 16px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.72), rgba(255, 247, 235, 0.2)),
    rgba(255, 255, 255, 0.2);
  box-shadow:
    0 14px 26px rgba(80, 42, 16, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.summary-card span,
.summary-card b {
  display: block;
}

.summary-card span {
  color: #76512e;
  font-size: 12px;
  font-weight: 900;
}

.summary-card b {
  margin-top: 7px;
  color: #2f2114;
  font-size: 24px;
  font-weight: 950;
}

.summary-card.success b { color: #347449; }
.summary-card.info b { color: #346b8c; }
.summary-card.warn b { color: #a36616; }
.summary-card.danger b { color: #a84234; }
.summary-card.muted b { color: #72706b; }

.expired-banner {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 42px;
  padding: 9px 12px;
  border: 1px solid rgba(174, 72, 54, 0.3);
  border-radius: 14px;
  color: #9f392f;
  font-size: 13px;
  font-weight: 900;
  background: rgba(255, 235, 229, 0.62);
}

.table-shell {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 18px;
  background:
    linear-gradient(128deg, rgba(255, 255, 255, 0.74), rgba(255, 255, 255, 0.12) 50%),
    rgba(255, 255, 255, 0.2);
  box-shadow:
    0 18px 36px rgba(80, 42, 16, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.table-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 13px 14px;
}

.table-heading b,
.table-heading span {
  display: block;
}

.table-heading b {
  color: #3d2614;
  font-size: 16px;
  font-weight: 950;
}

.table-heading span {
  color: #76512e;
  font-size: 12px;
  font-weight: 850;
}

.pdf-import-data-table {
  min-width: 1060px;
}

.table-shell :deep(.p-datatable-wrapper) {
  overflow-x: auto;
}

.table-shell :deep(.p-datatable-thead > tr > th) {
  color: #5d3b20;
  font-size: 12px;
  font-weight: 950;
  background: rgba(255, 247, 235, 0.86);
}

.table-shell :deep(.p-datatable-tbody > tr > td) {
  color: #3a2717;
  font-size: 13px;
  font-weight: 850;
}

.file-cell {
  display: flex;
  gap: 7px;
  align-items: center;
  min-width: 0;
  color: #8f4a22;
}

.file-cell span {
  overflow: hidden;
  color: #362515;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.muted-text {
  color: #83705e;
  font-size: 12px;
  font-weight: 850;
}

.message-text {
  color: #5d4a35;
  font-size: 12px;
  line-height: 1.35;
}

.message-text.confirm { color: #9d661d; }
.message-text.error { color: #a84234; }
.message-text.duplicate { color: #706d67; }

.model-input.required {
  outline: 2px solid rgba(201, 117, 36, 0.34);
}

.select-box,
.effective-box {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  min-height: 32px;
  color: #604226;
  font-size: 12px;
  font-weight: 900;
}

.select-box input,
.effective-box input {
  width: 18px;
  height: 18px;
  accent-color: #b66028;
}

.select-box.disabled {
  opacity: 0.46;
}

.select-box span {
  display: none;
}

.legend-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.legend {
  min-height: 28px;
  padding: 6px 10px;
  border-radius: 999px;
  color: #fff;
  font-size: 12px;
  font-weight: 950;
}

.legend.create { background: #4f9a63; }
.legend.version { background: #407da0; }
.legend.duplicate { background: #8a877f; }
.legend.confirm { background: #c28a2e; }
.legend.error { background: #b54b3f; }

@media (max-width: 1060px) {
  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
