<script setup lang="ts">
import { computed, ref } from 'vue'
import { FileSpreadsheet, Trash2, UploadCloud } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { OrderScope } from '@/types/order-management'

const store = useDocumentHubStore()
const inputRef = ref<HTMLInputElement | null>(null)

const scopeOptions: Array<{ label: string; value: OrderScope }> = [
  { label: '今日订单', value: 'today' },
  { label: '本周订单', value: 'week' },
]

const fileName = computed(() => store.orderImportFile?.name ?? '尚未选择文件')

function chooseFile() {
  inputRef.value?.click()
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  store.setOrderImportFile(input.files?.[0] ?? null)
  input.value = ''
}
</script>

<template>
  <section class="file-panel">
    <div class="scope-row">
      <button
        v-for="option in scopeOptions"
        :key="option.value"
        type="button"
        :class="{ active: store.orderImportScope === option.value }"
        @click="store.orderImportScope = option.value"
      >
        {{ option.label }}
      </button>
    </div>

    <div class="file-drop" role="button" tabindex="0" @click="chooseFile" @keydown.enter.prevent="chooseFile">
      <FileSpreadsheet :size="34" />
      <div>
        <b>{{ fileName }}</b>
        <span>仅支持 XLSX 订单文件</span>
      </div>
      <PrimeButton type="button" severity="secondary" outlined>
        <UploadCloud :size="16" />
        <span>选择文件</span>
      </PrimeButton>
      <input ref="inputRef" class="sr-only" type="file" accept=".xlsx" @change="onFileChange">
    </div>

    <div class="template-note">
      <b>标准模板说明</b>
      <span>Excel 仅需一列“产品型号”。数量、状态和客户资料不会从 Excel 自动导入。</span>
      <code>第一行表头：产品型号</code>
    </div>

    <div class="file-actions">
      <PrimeButton
        severity="secondary"
        text
        :disabled="!store.orderImportFile || store.orderImportLoading"
        @click="store.setOrderImportFile(null)"
      >
        <Trash2 :size="16" />
        <span>移除文件</span>
      </PrimeButton>
      <PrimeButton
        :disabled="!store.orderImportFile"
        :loading="store.orderImportLoading"
        @click="store.previewOrderImport()"
      >
        <FileSpreadsheet :size="16" />
        <span>识别并预览</span>
      </PrimeButton>
    </div>
  </section>
</template>

<style scoped>
.file-panel {
  display: grid;
  gap: 12px;
}

.scope-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.scope-row button {
  min-height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.35);
  color: #68401f;
  font-weight: 950;
  cursor: pointer;
}

.scope-row button.active {
  color: #fff8ec;
  background:
    linear-gradient(145deg, rgba(206, 105, 42, 0.84), rgba(151, 75, 35, 0.72)),
    rgba(255, 255, 255, 0.2);
}

.file-drop {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 112px;
  padding: 16px;
  border: 1px dashed rgba(157, 94, 39, 0.32);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.28);
  color: #7d542b;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.74);
}

.file-drop b,
.file-drop span,
.template-note span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-drop b {
  color: #342112;
  font-size: 16px;
  font-weight: 950;
}

.file-drop span,
.template-note {
  color: #7d542b;
  font-size: 13px;
  font-weight: 850;
}

.template-note {
  display: grid;
  gap: 5px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.32);
}

.template-note b {
  color: #3e2915;
  font-weight: 950;
}

.template-note code {
  justify-self: start;
  padding: 5px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.52);
  color: #8b4c22;
  font-weight: 950;
}

.file-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.file-actions :deep(.p-button) {
  min-height: 44px;
  border-radius: 14px;
  font-weight: 950;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
</style>
