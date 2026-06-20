<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowLeft, CheckCircle2, FileText, RefreshCw, UploadCloud, X } from 'lucide-vue-next'
import { useConfirm } from 'primevue/useconfirm'
import WarmPdfImportFilePanel from './WarmPdfImportFilePanel.vue'
import WarmPdfImportPreviewTable from './WarmPdfImportPreviewTable.vue'
import WarmPdfImportResult from './WarmPdfImportResult.vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'

type PdfImportStep = 'files' | 'preview' | 'result'

const visible = defineModel<boolean>('visible', { required: true })
const store = useDocumentHubStore()
const confirm = useConfirm()
const step = ref<PdfImportStep>('files')

const dialogVisible = computed({
  get: () => visible.value,
  set: (next: boolean) => {
    if (!next && store.pdfImportApplyLoading) return
    visible.value = next
  },
})

const steps = computed(() => [
  { key: 'files', label: '选择文件' },
  { key: 'preview', label: '确认信息' },
  { key: 'result', label: '导入结果' },
] as const)

const selectedItems = computed(() => store.pdfImportItems.filter((item) => item.selected))
const isExpired = computed(() => {
  if (store.pdfImportPreview?.status === 'expired') return true
  const expiresAt = store.pdfImportPreview?.expiresAt
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now())
})
const confirmStats = computed(() => ({
  createProduct: selectedItems.value.filter((item) => item.action === 'create_product').length,
  addVersion: selectedItems.value.filter((item) => item.action === 'add_version').length,
  skip: store.pdfImportItems.filter((item) => !item.selected).length,
}))

watch(visible, (next) => {
  if (!next) return
  step.value = 'files'
  store.resetPdfImport()
  const defaultCustomerId = store.productDrawingDetail?.customer?.customerId
    ?? store.selectedCustomer?.customerId
    ?? null
  if (defaultCustomerId) store.setPdfImportCustomer(defaultCustomerId)
})

async function generatePreview() {
  const response = await store.previewPdfImport()
  if (!response) return
  if (response.status === 'completed' || response.status === 'partially_applied' || response.status === 'failed') {
    step.value = 'result'
    return
  }
  step.value = 'preview'
}

function hasInvalidSelectedRows() {
  return selectedItems.value.some((item) => item.action === 'error' || item.action === 'skip_duplicate' || item.action === 'skip')
}

function validateBeforeApply() {
  if (store.pdfImportApplyLoading) {
    store.pdfImportError = '不允许重复点击。'
    return false
  }
  if (isExpired.value) {
    store.pdfImportError = 'PDF 导入预览已过期，请重新选择文件。'
    return false
  }
  if (!selectedItems.value.length) {
    store.pdfImportError = '请至少选择一项需要导入的 PDF。'
    return false
  }
  if (hasInvalidSelectedRows()) {
    store.pdfImportError = '错误或重复文件不能选择导入。'
    return false
  }
  const unconfirmed = selectedItems.value.find((item) => (
    (item.needsConfirmation || item.action === 'needs_confirmation') &&
    !String(item.confirmedProductModel ?? '').trim()
  ))
  if (unconfirmed) {
    store.pdfImportError = '请先确认所有待确认文件的产品型号。'
    return false
  }
  return true
}

function confirmApply() {
  if (!validateBeforeApply()) return
  confirm.require({
    header: '确认导入 PDF 图纸',
    message: `系统将根据确认后的型号创建产品资料页或为已有产品新增原图版本。新建产品 ${confirmStats.value.createProduct} 项，新增版本 ${confirmStats.value.addVersion} 项，跳过 ${confirmStats.value.skip} 项。是否继续？`,
    acceptLabel: '确认导入',
    rejectLabel: '取消',
    accept: async () => {
      const response = await store.applyPdfImport()
      if (response) step.value = 'result'
    },
  })
}

function backToFiles() {
  step.value = 'files'
}

async function finishImport() {
  await store.loadCustomers()
  visible.value = false
  store.resetPdfImport()
  step.value = 'files'
}

function continueImport() {
  const customerId = store.pdfImportSelectedCustomerId
  store.resetPdfImport()
  if (customerId) store.setPdfImportCustomer(customerId)
  step.value = 'files'
}

async function openProduct(productId: string) {
  const product = store.productModels.find((item) => item.productId === productId)
    ?? (store.productDrawingDetail?.product.productId === productId ? store.productDrawingDetail.product : null)
  if (!product) return
  visible.value = false
  await store.openProduct(product, 'drawing')
}
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    modal
    class="pdf-import-dialog"
    header="导入 PDF 图纸"
    :closable="!store.pdfImportApplyLoading"
    :close-on-escape="!store.pdfImportApplyLoading"
    :dismissable-mask="false"
    :style="{ width: '92vw', maxWidth: '1180px' }"
    :content-style="{ maxHeight: 'calc(90vh - 168px)', overflow: 'auto' }"
  >
    <div class="dialog-subtitle">
      根据 PDF 文件名识别产品型号，确认后创建产品资料页或新增原图版本。
    </div>

    <nav class="step-strip" aria-label="PDF 导入步骤">
      <span
        v-for="(item, index) in steps"
        :key="item.key"
        class="step-pill"
        :class="{ active: item.key === step, done: steps.findIndex((entry) => entry.key === step) > index }"
      >
        <b>{{ index + 1 }}</b>
        <em>{{ item.label }}</em>
      </span>
    </nav>

    <div v-if="store.pdfImportError" class="dialog-error">
      {{ store.pdfImportError }}
    </div>

    <WarmPdfImportFilePanel v-if="step === 'files'" />
    <WarmPdfImportPreviewTable v-else-if="step === 'preview'" />
    <WarmPdfImportResult v-else @open-product="openProduct" />

    <template #footer>
      <div class="dialog-footer">
        <template v-if="step === 'files'">
          <PrimeButton severity="secondary" outlined :disabled="store.pdfImportPreviewLoading" @click="visible = false">
            <X :size="17" />
            <span>取消</span>
          </PrimeButton>
          <PrimeButton :loading="store.pdfImportPreviewLoading" :disabled="store.pdfImportPreviewLoading" @click="generatePreview">
            <UploadCloud :size="17" />
            <span>识别并预览</span>
          </PrimeButton>
        </template>

        <template v-else-if="step === 'preview'">
          <PrimeButton severity="secondary" outlined :disabled="store.pdfImportApplyLoading" @click="backToFiles">
            <ArrowLeft :size="17" />
            <span>返回选择文件</span>
          </PrimeButton>
          <PrimeButton severity="secondary" outlined :disabled="store.pdfImportApplyLoading" @click="visible = false">
            <X :size="17" />
            <span>取消</span>
          </PrimeButton>
          <PrimeButton :loading="store.pdfImportApplyLoading" :disabled="store.pdfImportApplyLoading || isExpired" @click="confirmApply">
            <CheckCircle2 :size="17" />
            <span>确认导入</span>
          </PrimeButton>
        </template>

        <template v-else>
          <PrimeButton severity="secondary" outlined @click="continueImport">
            <RefreshCw :size="17" />
            <span>继续导入</span>
          </PrimeButton>
          <PrimeButton @click="finishImport">
            <FileText :size="17" />
            <span>完成</span>
          </PrimeButton>
        </template>
      </div>
    </template>
  </PrimeDialog>
</template>

<style scoped>
.dialog-subtitle {
  margin: -3px 0 12px;
  color: #76512e;
  font-size: 13px;
  font-weight: 850;
}

.step-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
  margin-bottom: 12px;
}

.step-pill {
  display: flex;
  gap: 9px;
  align-items: center;
  min-height: 44px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 14px;
  color: #76512e;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.62), rgba(255, 247, 235, 0.2)),
    rgba(255, 255, 255, 0.18);
  box-shadow:
    0 12px 22px rgba(80, 42, 16, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.step-pill b {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  color: #fff;
  font-size: 13px;
  background: #9c8064;
}

.step-pill em {
  font-size: 13px;
  font-style: normal;
  font-weight: 950;
}

.step-pill.active {
  color: #3b2717;
  border-color: rgba(191, 105, 45, 0.34);
}

.step-pill.active b {
  background: #b66028;
}

.step-pill.done b {
  background: #4f9a63;
}

.dialog-error {
  min-height: 40px;
  margin-bottom: 12px;
  padding: 9px 12px;
  border: 1px solid rgba(174, 72, 54, 0.3);
  border-radius: 14px;
  color: #9f392f;
  font-size: 13px;
  font-weight: 900;
  background: rgba(255, 235, 229, 0.62);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  width: 100%;
}

.dialog-footer :deep(.p-button) {
  min-height: 48px;
  border-radius: 14px;
  font-weight: 950;
}

:global(.pdf-import-dialog.p-dialog) {
  max-height: 90vh;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 24px;
  background:
    linear-gradient(128deg, rgba(255, 255, 255, 0.9), rgba(255, 247, 235, 0.52)),
    rgba(255, 255, 255, 0.62);
  box-shadow:
    0 34px 92px rgba(75, 38, 13, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(28px) saturate(1.18);
  -webkit-backdrop-filter: blur(28px) saturate(1.18);
}

:global(.pdf-import-dialog .p-dialog-header) {
  padding: 18px 20px 10px;
  color: #3b2717;
  font-weight: 950;
}

:global(.pdf-import-dialog .p-dialog-content) {
  padding: 0 20px 14px;
}

:global(.pdf-import-dialog .p-dialog-footer) {
  position: sticky;
  bottom: 0;
  z-index: 2;
  padding: 12px 20px 16px;
  border-top: 1px solid rgba(128, 88, 47, 0.12);
  background: rgba(255, 250, 242, 0.88);
  backdrop-filter: blur(18px) saturate(1.15);
  -webkit-backdrop-filter: blur(18px) saturate(1.15);
}

@media (max-height: 780px) {
  .step-pill {
    min-height: 38px;
    padding: 6px 9px;
  }

  :global(.pdf-import-dialog .p-dialog-header) {
    padding-top: 12px;
  }

  :global(.pdf-import-dialog .p-dialog-footer) {
    padding-top: 9px;
    padding-bottom: 10px;
  }
}
</style>
