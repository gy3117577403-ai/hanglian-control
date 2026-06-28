<script setup lang="ts">
import { computed, ref } from 'vue'
import { AlertTriangle, CheckCircle2, FileText, Trash2, UploadCloud } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
const fileInput = ref<HTMLInputElement | null>(null)
const dragActive = ref(false)
const notice = ref('')

const MAX_FILE_BYTES = 30 * 1024 * 1024
const MAX_TOTAL_BYTES = 300 * 1024 * 1024
const MAX_FILES = 50

const customerOptions = computed(() => store.customers.map((customer) => ({
  label: `${customer.customerName}${customer.customerShortName ? `（${customer.customerShortName}）` : ''}`,
  value: customer.customerId,
})))

const totalSize = computed(() => store.pdfImportFiles.reduce((sum, file) => sum + file.size, 0))
const hasFiles = computed(() => store.pdfImportFiles.length > 0)

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function uniqueFiles(files: File[]) {
  const seen = new Set<string>()
  const result: File[] = []
  for (const file of files) {
    const key = `${file.name}::${file.size}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(file)
  }
  return result
}

function isPdf(file: File) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

function validateFiles(files: File[]) {
  const nonPdf = files.find((file) => !isPdf(file))
  if (nonPdf) return '仅支持 PDF 图纸文件。'
  const oversized = files.find((file) => file.size > MAX_FILE_BYTES)
  if (oversized) return `文件超过 30 MB：${oversized.name}`
  if (files.length > MAX_FILES) return '单次最多选择 50 个 PDF 文件。'
  const total = files.reduce((sum, file) => sum + file.size, 0)
  if (total > MAX_TOTAL_BYTES) return '单次文件总大小不能超过 300 MB。'
  return ''
}

function appendFiles(fileList?: FileList | null) {
  if (!fileList?.length) return
  notice.value = ''
  const merged = [...store.pdfImportFiles, ...Array.from(fileList)]
  const deduped = uniqueFiles(merged)
  const validationMessage = validateFiles(deduped)
  if (validationMessage) {
    store.pdfImportError = validationMessage
    return
  }
  const changed = store.setPdfImportFiles(deduped)
  if (changed && deduped.length < merged.length) notice.value = '已忽略重复选择的文件。'
}

function chooseFiles() {
  fileInput.value?.click()
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  appendFiles(input.files)
  input.value = ''
}

function onDrop(event: DragEvent) {
  dragActive.value = false
  appendFiles(event.dataTransfer?.files)
}

function removeFile(index: number) {
  notice.value = ''
  const next = store.pdfImportFiles.filter((_, fileIndex) => fileIndex !== index)
  store.setPdfImportFiles(next)
}

function onCustomerChange(value: string | null) {
  store.setPdfImportCustomer(value)
}
</script>

<template>
  <section class="pdf-file-panel" data-pdf-import-file-panel>
    <div class="field-card customer-card">
      <div class="field-heading">
        <span>客户</span>
        <small>选择已有图纸客户</small>
      </div>
      <PrimeSelect
        v-model="store.pdfImportSelectedCustomerId"
        class="customer-select"
        filter
        :options="customerOptions"
        option-label="label"
        option-value="value"
        placeholder="请选择客户"
        empty-message="暂无客户，请先创建客户资料。"
        empty-filter-message="暂无匹配客户"
        @update:model-value="onCustomerChange"
      />
      <p v-if="!store.customers.length" class="empty-hint">暂无客户，请先创建客户资料。</p>
    </div>

    <div
      class="drop-card"
      :class="{ active: dragActive }"
      data-pdf-dropzone
      @dragenter.prevent="dragActive = true"
      @dragover.prevent="dragActive = true"
      @dragleave.prevent="dragActive = false"
      @drop.prevent="onDrop"
    >
      <div class="drop-icon">
        <UploadCloud :size="34" />
      </div>
      <div class="drop-copy">
        <b>选择 PDF 或拖拽 PDF 到此处</b>
        <span>单个文件最大 30 MB，单次最多 50 个，总大小不超过 300 MB。</span>
      </div>
      <PrimeButton class="choose-button" type="button" @click="chooseFiles">
        <FileText :size="18" />
        <span>选择 PDF</span>
      </PrimeButton>
      <input ref="fileInput" class="hidden-input" type="file" accept="application/pdf,.pdf" multiple @change="onFileChange">
    </div>

    <div v-if="store.pdfImportError" class="message error-message">
      <AlertTriangle :size="17" />
      <span>{{ store.pdfImportError }}</span>
    </div>
    <div v-else-if="notice" class="message notice-message">
      <CheckCircle2 :size="17" />
      <span>{{ notice }}</span>
    </div>

    <section class="file-list-card" :class="{ empty: !hasFiles }">
      <div class="list-header">
        <div>
          <b>文件列表</b>
          <span>{{ store.pdfImportFiles.length }} 个文件，合计 {{ formatFileSize(totalSize) }}</span>
        </div>
        <PrimeTag :severity="hasFiles ? 'success' : 'secondary'" :value="hasFiles ? '已选择' : '待选择'" />
      </div>

      <div v-if="!hasFiles" class="empty-file">
        <FileText :size="30" />
        <span>请选择 PDF 图纸文件。</span>
      </div>

      <div v-else class="file-rows">
        <article v-for="(file, index) in store.pdfImportFiles" :key="`${file.name}-${file.size}-${index}`" class="file-row">
          <FileText :size="21" />
          <div class="file-main">
            <b>{{ file.name }}</b>
            <span>{{ formatFileSize(file.size) }}</span>
          </div>
          <PrimeTag severity="success" value="可预览" />
          <PrimeButton severity="secondary" text rounded title="移除文件" aria-label="移除文件" @click="removeFile(index)">
            <Trash2 :size="17" />
          </PrimeButton>
        </article>
      </div>
    </section>
  </section>
</template>

<style scoped>
.pdf-file-panel {
  display: grid;
  gap: 12px;
}

.field-card,
.drop-card,
.file-list-card {
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 18px;
  background:
    linear-gradient(128deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.14) 46%, transparent),
    linear-gradient(302deg, rgba(105, 151, 145, 0.16), rgba(255, 239, 218, 0.2)),
    rgba(255, 255, 255, 0.18);
  box-shadow:
    0 18px 36px rgba(80, 42, 16, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    inset 0 -18px 34px rgba(142, 82, 38, 0.04);
  backdrop-filter: blur(18px) saturate(1.15);
  -webkit-backdrop-filter: blur(18px) saturate(1.15);
}

.field-card {
  display: grid;
  grid-template-columns: minmax(140px, 0.32fr) minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 14px;
}

.field-heading span,
.field-heading small {
  display: block;
}

.field-heading span {
  color: #3d2614;
  font-size: 16px;
  font-weight: 950;
}

.field-heading small,
.empty-hint {
  color: #84613a;
  font-size: 12px;
  font-weight: 850;
}

.customer-select {
  min-width: 0;
}

.customer-card :deep(.p-select) {
  min-height: 48px;
  border-radius: 14px;
  font-weight: 900;
}

.empty-hint {
  grid-column: 2;
  margin: -6px 0 0;
}

.drop-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  min-height: 138px;
  padding: 18px;
  border-style: dashed;
  border-color: rgba(176, 96, 42, 0.32);
}

.drop-card.active {
  border-color: rgba(76, 133, 116, 0.58);
  background:
    linear-gradient(128deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.16) 48%, transparent),
    linear-gradient(302deg, rgba(86, 151, 137, 0.26), rgba(255, 239, 218, 0.2)),
    rgba(255, 255, 255, 0.24);
}

.drop-icon {
  display: grid;
  place-items: center;
  width: 62px;
  height: 62px;
  border-radius: 18px;
  color: #9e5428;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.82), rgba(255, 218, 177, 0.34)),
    rgba(255, 255, 255, 0.3);
  box-shadow:
    0 14px 26px rgba(116, 58, 22, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.drop-copy b,
.drop-copy span {
  display: block;
}

.drop-copy b {
  color: #382314;
  font-size: 18px;
  font-weight: 950;
}

.drop-copy span {
  margin-top: 5px;
  color: #76512e;
  font-size: 13px;
  font-weight: 850;
}

.choose-button {
  min-height: 48px;
  border-radius: 14px;
  font-weight: 950;
}

.hidden-input {
  display: none;
}

.message {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 42px;
  padding: 9px 12px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 900;
}

.error-message {
  border: 1px solid rgba(174, 72, 54, 0.3);
  color: #9f392f;
  background: rgba(255, 235, 229, 0.62);
}

.notice-message {
  border: 1px solid rgba(83, 145, 111, 0.3);
  color: #426b45;
  background: rgba(232, 247, 232, 0.62);
}

.file-list-card {
  padding: 14px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.list-header b,
.list-header span {
  display: block;
}

.list-header b {
  color: #3d2614;
  font-size: 16px;
  font-weight: 950;
}

.list-header span {
  color: #76512e;
  font-size: 12px;
  font-weight: 850;
}

.empty-file {
  display: grid;
  place-items: center;
  min-height: 118px;
  color: #8a6239;
  font-size: 13px;
  font-weight: 900;
}

.file-rows {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.file-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  gap: 10px;
  align-items: center;
  min-height: 54px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.34);
  color: #8f4a22;
}

.file-main {
  min-width: 0;
}

.file-main b,
.file-main span {
  display: block;
}

.file-main b {
  overflow: hidden;
  color: #352314;
  font-size: 13px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-main span {
  color: #76512e;
  font-size: 12px;
  font-weight: 850;
}

.file-row :deep(.p-button) {
  width: 40px;
  min-width: 40px;
  height: 40px;
  min-height: 40px;
  padding: 0;
}

@media (max-width: 900px) {
  .field-card,
  .drop-card {
    grid-template-columns: 1fr;
  }

  .empty-hint {
    grid-column: 1;
  }
}
</style>
