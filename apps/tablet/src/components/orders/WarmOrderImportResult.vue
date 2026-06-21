<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle2, RotateCcw } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { OrderImportApplyResult } from '@/types/order-management'

const store = useDocumentHubStore()

const resultLabel: Record<OrderImportApplyResult, string> = {
  created: '创建成功',
  skipped_duplicate: '重复跳过',
  already_active: '已存在',
  needs_confirmation: '仍需确认',
  skipped_by_user: '用户跳过',
  error: '失败',
}

const result = computed(() => store.orderImportResult)

function continueImport() {
  store.resetOrderImport()
}

function finish() {
  store.orderImportOpen = false
  store.resetOrderImport()
}
</script>

<template>
  <section class="result-panel">
    <div v-if="result" class="result-summary">
      <span>创建成功 <b>{{ result.summary.created }}</b></span>
      <span>重复跳过 <b>{{ result.summary.skippedDuplicate }}</b></span>
      <span>已存在 <b>{{ result.summary.alreadyActive }}</b></span>
      <span>需确认 <b>{{ result.summary.needsConfirmation }}</b></span>
      <span>用户跳过 <b>{{ result.summary.skippedByUser }}</b></span>
      <span>失败 <b>{{ result.summary.error }}</b></span>
    </div>

    <div v-if="result" class="result-list">
      <article v-for="item in result.items" :key="item.importItemId" class="result-row" :class="item.result">
        <b>{{ resultLabel[item.result] }}</b>
        <span>{{ item.message || item.errorMessage }}</span>
      </article>
    </div>

    <div class="result-actions">
      <PrimeButton severity="secondary" outlined @click="continueImport">
        <RotateCcw :size="16" />
        <span>继续导入</span>
      </PrimeButton>
      <PrimeButton @click="finish">
        <CheckCircle2 :size="16" />
        <span>完成</span>
      </PrimeButton>
    </div>
  </section>
</template>

<style scoped>
.result-panel {
  display: grid;
  gap: 12px;
}

.result-summary {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 7px;
}

.result-summary span {
  display: grid;
  place-items: center;
  min-height: 54px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.36);
  color: #70421d;
  font-size: 12px;
  font-weight: 900;
  text-align: center;
}

.result-summary b {
  color: #a34f1f;
  font-size: 17px;
}

.result-list {
  display: grid;
  gap: 8px;
  max-height: 46vh;
  overflow-y: auto;
  padding-right: 4px;
}

.result-row {
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  min-height: 50px;
  padding: 9px 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.32);
  color: #70421d;
  font-size: 12px;
  font-weight: 850;
}

.result-row.created {
  background: rgba(32, 145, 108, 0.12);
}

.result-row.error,
.result-row.needs_confirmation {
  background: rgba(174, 71, 60, 0.1);
}

.result-row b,
.result-row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-row b {
  color: #342112;
  font-weight: 950;
}

.result-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.result-actions :deep(.p-button) {
  min-height: 44px;
  border-radius: 14px;
  font-weight: 950;
}

@media (max-width: 1200px) {
  .result-summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
