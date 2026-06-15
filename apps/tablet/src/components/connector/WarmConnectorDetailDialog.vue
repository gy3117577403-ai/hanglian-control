<script setup lang="ts">
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
</script>

<template>
  <PrimeDialog v-model:visible="store.connectorDetailOpen" modal header="连接器参数详情" :style="{ width: '620px' }">
    <div v-if="store.selectedConnector" class="detail-grid">
      <div><span>连接器型号</span><b>{{ store.selectedConnector.connectorModel }}</b></div>
      <div><span>端子型号</span><b>{{ store.selectedConnector.terminalModel }}</b></div>
      <div><span>孔位数</span><b>{{ store.selectedConnector.pinCount }}</b></div>
      <div><span>颜色</span><b>{{ store.selectedConnector.color }}</b></div>
      <div><span>适配线径</span><b>{{ store.selectedConnector.wireRange }}</b></div>
      <div><span>厂家</span><b>{{ store.selectedConnector.manufacturer }}</b></div>
      <div><span>锁止方式</span><b>{{ store.selectedConnector.lockType }}</b></div>
      <div><span>适用工序</span><b>{{ store.selectedConnector.processSegment }}</b></div>
      <div><span>状态</span><b>{{ store.selectedConnector.status }}</b></div>
      <div class="full"><span>备注</span><b>{{ store.selectedConnector.remark || '无' }}</b></div>
    </div>
  </PrimeDialog>
</template>

<style scoped>
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

div > div {
  padding: 12px;
  border-radius: 13px;
  background: rgba(255, 246, 230, 0.82);
}

.full {
  grid-column: 1 / -1;
}

span,
b {
  display: block;
}

span {
  color: #8a6239;
  font-size: 12px;
  font-weight: 850;
}

b {
  margin-top: 4px;
  color: #342112;
  font-size: 16px;
  font-weight: 950;
}
</style>
