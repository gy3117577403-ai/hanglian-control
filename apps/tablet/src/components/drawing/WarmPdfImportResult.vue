<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, CheckCircle2, Eye, FileText } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { PdfImportApplyResult } from '@/types/pdf-import'

const emit = defineEmits<{
  'open-product': [productId: string]
}>()

const store = useDocumentHubStore()

const result = computed(() => store.pdfImportApplyResult)
const summary = computed(() => result.value?.summary)

const statusInfo = computed(() => {
  if (result.value?.status === 'completed') {
    return { label: '全部完成', tone: 'success', icon: CheckCircle2 }
  }
  if (result.value?.status === 'partially_applied') {
    return { label: '部分完成', tone: 'warn', icon: AlertTriangle }
  }
  return { label: '导入失败', tone: 'danger', icon: AlertTriangle }
})

const summaryCards = computed(() => [
  { label: '新建产品', value: summary.value?.createdProduct ?? 0, tone: 'success' },
  { label: '新增版本', value: summary.value?.addedVersion ?? 0, tone: 'info' },
  { label: '重复跳过', value: summary.value?.skippedDuplicate ?? 0, tone: 'muted' },
  { label: '仍需确认', value: summary.value?.needsConfirmation ?? 0, tone: 'warn' },
  { label: '用户跳过', value: summary.value?.skippedByUser ?? 0, tone: 'neutral' },
  { label: '失败', value: summary.value?.error ?? 0, tone: 'danger' },
])

function resultLabel(value: PdfImportApplyResult) {
  const labels: Record<PdfImportApplyResult, string> = {
    created_product: '已创建产品并导入原图',
    added_version: '已新增原图版本',
    skipped_duplicate: '文件已存在，已跳过',
    needs_confirmation: '仍需确认产品型号',
    skipped_by_user: '未选择导入',
    error: '导入失败',
  }
  return labels[value] ?? '待确认'
}

function resultSeverity(value: PdfImportApplyResult) {
  if (value === 'created_product' || value === 'added_version') return 'success'
  if (value === 'skipped_duplicate' || value === 'skipped_by_user') return 'secondary'
  if (value === 'needs_confirmation') return 'warn'
  return 'danger'
}

function canOpenProduct(productId?: string) {
  return Boolean(productId && store.productModels.some((product) => product.productId === productId))
}

function openProduct(productId?: string) {
  if (!productId) return
  emit('open-product', productId)
}
</script>

<template>
  <section class="pdf-import-result" data-pdf-import-result>
    <div v-if="result" class="status-card" :class="statusInfo.tone">
      <component :is="statusInfo.icon" :size="34" />
      <div>
        <b>{{ statusInfo.label }}</b>
        <span>{{ result.customer.customerName }} 的 PDF 图纸导入已返回真实处理结果。</span>
      </div>
    </div>

    <div class="summary-grid">
      <article v-for="card in summaryCards" :key="card.label" class="summary-card" :class="card.tone">
        <span>{{ card.label }}</span>
        <b>{{ card.value }}</b>
      </article>
    </div>

    <div class="result-list">
      <div class="result-heading">
        <div>
          <b>导入明细</b>
          <span>逐项显示后端返回的处理结果和提示信息。</span>
        </div>
        <PrimeTag :severity="result?.status === 'completed' ? 'success' : result?.status === 'failed' ? 'danger' : 'warn'" :value="statusInfo.label" />
      </div>

      <article v-for="item in result?.items ?? []" :key="item.importItemId" class="result-row" :class="item.result">
        <FileText :size="21" />
        <div class="result-main">
          <b>{{ item.originalFileName }}</b>
          <span>{{ item.confirmedProductModel || '未确认型号' }}</span>
          <em>{{ item.errorMessage || item.message }}</em>
        </div>
        <PrimeTag :severity="resultSeverity(item.result)" :value="resultLabel(item.result)" />
        <span v-if="item.documentStatus" class="doc-status">{{ item.documentStatus === 'effective' ? '当前有效' : '待复核' }}</span>
        <PrimeButton
          v-if="canOpenProduct(item.productId)"
          class="open-product-button"
          severity="secondary"
          outlined
          @click="openProduct(item.productId)"
        >
          <Eye :size="16" />
          <span>查看产品</span>
        </PrimeButton>
      </article>
    </div>
  </section>
</template>

<style scoped>
.pdf-import-result {
  display: grid;
  gap: 12px;
}

.status-card,
.result-list,
.summary-card {
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 18px;
  background:
    linear-gradient(128deg, rgba(255, 255, 255, 0.74), rgba(255, 255, 255, 0.12) 50%),
    rgba(255, 255, 255, 0.2);
  box-shadow:
    0 18px 36px rgba(80, 42, 16, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.status-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 13px;
  align-items: center;
  min-height: 92px;
  padding: 16px;
}

.status-card.success { color: #347449; }
.status-card.warn { color: #a36616; }
.status-card.danger { color: #a84234; }

.status-card b,
.status-card span {
  display: block;
}

.status-card b {
  color: #2f2114;
  font-size: 22px;
  font-weight: 950;
}

.status-card span {
  margin-top: 3px;
  color: #76512e;
  font-size: 13px;
  font-weight: 850;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
}

.summary-card {
  min-height: 76px;
  padding: 11px 12px;
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

.result-list {
  overflow: hidden;
}

.result-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 13px 14px;
}

.result-heading b,
.result-heading span {
  display: block;
}

.result-heading b {
  color: #3d2614;
  font-size: 16px;
  font-weight: 950;
}

.result-heading span {
  color: #76512e;
  font-size: 12px;
  font-weight: 850;
}

.result-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto auto;
  gap: 10px;
  align-items: center;
  min-height: 70px;
  padding: 10px 14px;
  border-top: 1px solid rgba(122, 83, 45, 0.08);
  color: #8f4a22;
}

.result-row.error,
.result-row.needs_confirmation {
  background: rgba(255, 238, 231, 0.36);
}

.result-main {
  min-width: 0;
}

.result-main b,
.result-main span,
.result-main em {
  display: block;
}

.result-main b {
  overflow: hidden;
  color: #352314;
  font-size: 13px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-main span {
  color: #76512e;
  font-size: 12px;
  font-weight: 900;
}

.result-main em {
  margin-top: 3px;
  color: #6c5a48;
  font-size: 12px;
  font-style: normal;
  font-weight: 850;
}

.doc-status {
  min-height: 26px;
  padding: 5px 9px;
  border-radius: 999px;
  color: #4f6f43;
  font-size: 12px;
  font-weight: 950;
  background: rgba(229, 246, 224, 0.72);
}

.open-product-button {
  min-height: 42px;
  border-radius: 13px;
  font-weight: 950;
}

@media (max-width: 1060px) {
  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .result-row {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .doc-status,
  .open-product-button {
    grid-column: 2 / -1;
    justify-self: start;
  }
}
</style>
