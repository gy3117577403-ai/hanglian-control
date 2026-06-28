<script setup lang="ts">
import { computed } from 'vue'
import WarmOrderImportFilePanel from './WarmOrderImportFilePanel.vue'
import WarmOrderImportPreview from './WarmOrderImportPreview.vue'
import WarmOrderImportResult from './WarmOrderImportResult.vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()

const stage = computed(() => {
  if (store.orderImportResult) return 'result'
  if (store.orderImportPreview) return 'preview'
  return 'file'
})

const stageIndex = computed(() => stage.value === 'file' ? 1 : stage.value === 'preview' ? 2 : 3)

const canApply = computed(() => (
  Boolean(store.orderImportPreview) &&
  store.orderImportItems.some((item) => item.selected) &&
  !store.orderImportItems.some((item) => (
    item.selected &&
    item.action === 'needs_customer_confirmation' &&
    (!item.confirmedCustomerId || !item.confirmedProductId)
  ))
))

function backToFile() {
  store.orderImportPreview = null
  store.orderImportItems = []
  store.orderImportCandidateMap = {}
  store.orderImportError = ''
}
</script>

<template>
  <PrimeDialog
    v-model:visible="store.orderImportOpen"
    modal
    header="订单 XLSX 导入"
    class="order-import-dialog"
    :style="{ width: '94vw', maxWidth: '1160px' }"
  >
    <div class="stage-bar">
      <span :class="{ active: stageIndex >= 1 }">1 选择文件</span>
      <span :class="{ active: stageIndex >= 2 }">2 确认订单</span>
      <span :class="{ active: stageIndex >= 3 }">3 导入结果</span>
    </div>

    <p v-if="store.orderImportError" class="import-error">{{ store.orderImportError }}</p>

    <WarmOrderImportFilePanel v-if="stage === 'file'" />
    <WarmOrderImportPreview v-else-if="stage === 'preview'" />
    <WarmOrderImportResult v-else />

    <template #footer>
      <div v-if="stage === 'preview'" class="dialog-footer">
        <PrimeButton severity="secondary" text label="返回选择文件" :disabled="store.orderImportLoading" @click="backToFile" />
        <PrimeButton :disabled="!canApply" :loading="store.orderImportLoading" label="确认导入" @click="store.applyOrderImport()" />
      </div>
    </template>
  </PrimeDialog>
</template>

<style scoped>
.stage-bar {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

.stage-bar span {
  display: grid;
  place-items: center;
  min-height: 42px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.34);
  color: #7d542b;
  font-weight: 950;
}

.stage-bar span.active {
  color: #fff8ec;
  background:
    linear-gradient(145deg, rgba(206, 105, 42, 0.82), rgba(151, 75, 35, 0.72)),
    rgba(255, 255, 255, 0.18);
}

.import-error {
  margin: 0 0 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(174, 71, 60, 0.1);
  color: #9b3d32;
  font-size: 13px;
  font-weight: 900;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  width: 100%;
}

.dialog-footer :deep(.p-button) {
  min-height: 44px;
  border-radius: 14px;
  font-weight: 950;
}
</style>
