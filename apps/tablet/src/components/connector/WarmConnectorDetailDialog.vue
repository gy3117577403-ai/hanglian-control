<script setup lang="ts">
import { ref, watch } from 'vue'
import { Cable } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
const remarkDraft = ref('')

watch(
  () => [store.connectorDetailOpen, store.selectedConnector?.connectorId],
  () => {
    remarkDraft.value = cleanRemark(store.selectedConnector?.remark)
  },
  { immediate: true },
)

function formatMm(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return ''
  return `${value} mm`
}

function cleanRemark(value?: string) {
  const remark = value?.trim() ?? ''
  return remark.includes('?') ? '' : remark
}

async function saveRemark() {
  if (!store.selectedConnector) return
  await store.updateConnectorRemark(store.selectedConnector.connectorId, remarkDraft.value)
}
</script>

<template>
  <PrimeDialog v-model:visible="store.connectorDetailOpen" modal header="连接器参数详情" :style="{ width: '700px' }">
    <div v-if="store.selectedConnector" class="detail-panel">
      <section class="model-card">
        <i><Cable :size="24" /></i>
        <div>
          <span>连接器型号</span>
          <b>{{ store.selectedConnector.connectorModel }}</b>
        </div>
      </section>

      <div class="detail-grid">
        <div class="full">
          <span>规格</span>
          <b>{{ store.selectedConnector.specification || '' }}</b>
        </div>
        <div>
          <span>参数 1：入长</span>
          <b>{{ formatMm(store.selectedConnector.insertionLengthMm) }}</b>
        </div>
        <div>
          <span>参数 2：外剥长度</span>
          <b>{{ formatMm(store.selectedConnector.outerStripLengthMm) }}</b>
        </div>
        <div>
          <span>参数 3：内剥长度</span>
          <b>{{ formatMm(store.selectedConnector.innerStripLengthMm) }}</b>
        </div>
        <div>
          <span>状态</span>
          <b>{{ store.selectedConnector.status || '启用' }}</b>
        </div>
      </div>

      <label class="remark-editor">
        <span>参数 4：备注 / 注意事项</span>
        <PrimeTextarea v-model="remarkDraft" rows="4" auto-resize placeholder="可留空" />
      </label>
    </div>

    <template #footer>
      <PrimeButton label="关闭" severity="secondary" text @click="store.connectorDetailOpen = false" />
      <PrimeButton label="保存备注" @click="saveRemark" />
    </template>
  </PrimeDialog>
</template>

<style scoped>
.detail-panel {
  display: grid;
  gap: 12px;
}

.model-card,
.detail-grid > div,
.remark-editor {
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 18px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.78), rgba(250, 225, 190, 0.42)),
    radial-gradient(circle at 92% 12%, rgba(133, 180, 166, 0.24), transparent 44%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    0 12px 22px rgba(80, 42, 16, 0.08);
}

.model-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px;
}

.model-card i {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.86), rgba(235, 202, 160, 0.68));
  color: #9b5125;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.detail-grid > div {
  padding: 12px;
}

.detail-grid .full {
  grid-column: 1 / -1;
}

.remark-editor {
  display: grid;
  gap: 8px;
  padding: 12px;
}

span,
b {
  display: block;
}

span {
  color: #8a6239;
  font-size: 13px;
  font-weight: 850;
}

b {
  min-height: 23px;
  margin-top: 4px;
  color: #342112;
  font-size: 18px;
  font-weight: 950;
}

:deep(textarea) {
  border-color: rgba(139, 90, 42, 0.2);
  border-radius: 14px;
  background: rgba(255, 252, 245, 0.84);
  color: #342112;
  font-weight: 800;
}
</style>
