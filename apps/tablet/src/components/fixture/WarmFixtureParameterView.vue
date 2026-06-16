<script setup lang="ts">
import WarmFixtureDetailDialog from './WarmFixtureDetailDialog.vue'
import WarmFixtureTable from './WarmFixtureTable.vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
</script>

<template>
  <div class="parameter-view">
    <section class="view-head">
      <div>
        <p>独立搜索</p>
        <h2>治具参数</h2>
        <span>只搜索治具编号、治具名称、工位、适用产品和存放位置。</span>
      </div>
      <b>{{ store.fixtureRows.length }} 条</b>
    </section>
    <div class="scroll-area">
      <WarmFixtureTable :rows="store.fixtureRows" @open="store.openFixtureDetail" />
    </div>
    <WarmFixtureDetailDialog />
  </div>
</template>

<style scoped>
.parameter-view {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  padding: 14px;
}

.view-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 14px;
  border-radius: 18px;
  background: linear-gradient(145deg, #fff7ea, #ffd79d);
}

p,
h2,
span {
  margin: 0;
}

p {
  color: #9b5125;
  font-weight: 950;
}

h2 {
  margin-top: 3px;
  color: #342112;
  font-size: 28px;
  font-weight: 950;
}

span {
  color: #73512c;
  font-weight: 850;
}

b {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 250, 240, 0.78);
  color: #7a421f;
  white-space: nowrap;
}

.scroll-area {
  min-height: 0;
  overflow: auto;
}
</style>
