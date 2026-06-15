<script setup lang="ts">
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
</script>

<template>
  <PrimeDialog v-model:visible="store.fixtureDetailOpen" modal header="治具参数详情" :style="{ width: '620px' }">
    <div v-if="store.selectedFixture" class="detail-grid">
      <div><span>治具编号</span><b>{{ store.selectedFixture.fixtureCode }}</b></div>
      <div><span>治具名称</span><b>{{ store.selectedFixture.fixtureName }}</b></div>
      <div><span>治具类型</span><b>{{ store.selectedFixture.fixtureType }}</b></div>
      <div><span>适用产品</span><b>{{ store.selectedFixture.applicableProduct }}</b></div>
      <div><span>适用工位</span><b>{{ store.selectedFixture.station }}</b></div>
      <div><span>适用工序</span><b>{{ store.selectedFixture.processSegment }}</b></div>
      <div><span>存放位置</span><b>{{ store.selectedFixture.storageLocation }}</b></div>
      <div><span>状态</span><b>{{ store.selectedFixture.status }}</b></div>
      <div><span>保养周期</span><b>{{ store.selectedFixture.maintenanceCycle }}</b></div>
      <div class="full"><span>备注</span><b>{{ store.selectedFixture.remark || '无' }}</b></div>
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
