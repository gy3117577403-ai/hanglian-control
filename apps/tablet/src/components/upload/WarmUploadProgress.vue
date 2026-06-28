<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()

const progressText = computed(() => {
  if (store.uploadLoading) return `正在上传 ${store.uploadProgress.completed + store.uploadProgress.failed + 1} / ${store.uploadProgress.total}`
  if (!store.uploadResult) return ''
  return store.uploadResult.message
})

const resultTone = computed(() => {
  if (store.uploadLoading) return 'running'
  return store.uploadResult?.status ?? 'idle'
})
</script>

<template>
  <section v-if="store.uploadLoading || store.uploadResult || store.uploadError" class="progress-panel" :class="resultTone">
    <Loader2 v-if="store.uploadLoading" class="spin" :size="22" />
    <CheckCircle2 v-else-if="store.uploadResult?.status === 'success'" :size="22" />
    <AlertTriangle v-else :size="22" />
    <div>
      <strong>{{ progressText || store.uploadError }}</strong>
      <span v-if="store.uploadResult">
        成功 {{ store.uploadResult.successCount }} 项，失败 {{ store.uploadResult.failedCount }} 项，共 {{ store.uploadResult.total }} 项
      </span>
      <span v-else-if="store.uploadError">{{ store.uploadError }}</span>
    </div>
    <PrimeProgressBar v-if="store.uploadLoading" mode="indeterminate" />
  </section>
</template>

<style scoped>
.progress-panel {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  padding: 11px 12px;
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.36);
  color: #70421d;
  box-shadow:
    0 14px 26px rgba(80, 42, 16, 0.09),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.progress-panel.success {
  border-color: rgba(80, 145, 109, 0.38);
  color: #3f7a36;
}

.progress-panel.partial,
.progress-panel.failed {
  border-color: rgba(170, 67, 55, 0.38);
  color: #a23e31;
}

.progress-panel strong,
.progress-panel span {
  display: block;
}

.progress-panel strong {
  color: inherit;
  font-size: 14px;
  font-weight: 950;
}

.progress-panel span {
  margin-top: 2px;
  color: #76512a;
  font-size: 12px;
  font-weight: 850;
}

.progress-panel :deep(.p-progressbar) {
  grid-column: 1 / -1;
  height: 7px;
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
