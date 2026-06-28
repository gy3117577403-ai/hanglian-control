<script setup lang="ts">
import { Wrench } from 'lucide-vue-next'
import type { FixtureParameter } from '@/types/production'

defineProps<{
  rows: FixtureParameter[]
}>()

const emit = defineEmits<{
  open: [row: FixtureParameter]
}>()
</script>

<template>
  <div class="fixture-table">
    <div class="table-head">
      <span>治具编号</span>
      <span>治具名称</span>
      <span>类型</span>
      <span>适用产品</span>
      <span>工位</span>
      <span>工序</span>
      <span>位置</span>
      <span>状态</span>
      <span>保养周期</span>
    </div>
    <button v-for="row in rows" :key="row.fixtureId" type="button" class="table-row" @click="emit('open', row)">
      <b><Wrench :size="18" />{{ row.fixtureCode }}</b>
      <span>{{ row.fixtureName }}</span>
      <span>{{ row.fixtureType }}</span>
      <span>{{ row.applicableProduct }}</span>
      <span>{{ row.station }}</span>
      <span>{{ row.processSegment }}</span>
      <span>{{ row.storageLocation }}</span>
      <i>{{ row.status }}</i>
      <span>{{ row.maintenanceCycle }}</span>
    </button>
    <div v-if="!rows.length" class="empty">
      暂无治具参数，后续可通过 Excel 导入或手动维护。
    </div>
  </div>
</template>

<style scoped>
.fixture-table {
  min-width: 760px;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 1fr 1.2fr 0.9fr 1fr 1fr 0.9fr 0.8fr 0.65fr 0.8fr;
  gap: 8px;
  align-items: center;
}

.table-head {
  position: sticky;
  top: 0;
  z-index: 1;
  min-height: 42px;
  padding: 0 12px;
  border-radius: 13px;
  background: rgba(114, 73, 35, 0.92);
  color: #fff6e8;
  font-size: 12px;
  font-weight: 950;
  box-shadow: 0 10px 18px rgba(80, 42, 16, 0.12);
}

.table-row {
  width: 100%;
  min-height: 58px;
  margin-top: 8px;
  padding: 9px 12px;
  border: 1px solid rgba(139, 90, 42, 0.16);
  border-radius: 14px;
  background: linear-gradient(145deg, rgba(255, 252, 245, 0.96), rgba(255, 235, 205, 0.8));
  color: #70502b;
  text-align: left;
  box-shadow: 0 10px 18px rgba(80, 42, 16, 0.08);
}

b,
span,
i {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

b {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  color: #342112;
  font-weight: 950;
}

span,
i {
  font-style: normal;
  font-weight: 850;
}

i {
  width: fit-content;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(73, 138, 70, 0.12);
  color: #3f7a36;
}

.empty {
  display: grid;
  place-items: center;
  min-height: 260px;
  margin-top: 8px;
  border: 1px dashed rgba(139, 90, 42, 0.2);
  border-radius: 16px;
  color: #8a6239;
  font-weight: 850;
  text-align: center;
}
</style>
