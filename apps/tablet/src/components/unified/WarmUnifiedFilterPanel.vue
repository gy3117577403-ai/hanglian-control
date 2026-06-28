<script setup lang="ts">
import { ArchiveRestore, Database, Filter, FolderOpen } from 'lucide-vue-next'
import { useUnifiedDocumentStore } from '@/stores/unified-document-store'
import type { UnifiedDocumentType } from '@/types/production'

const store = useUnifiedDocumentStore()

const typeOptions: Array<{ label: string; value: UnifiedDocumentType }> = [
  { label: '全部', value: 'all' },
  { label: '图纸', value: 'drawing' },
  { label: 'SOP', value: 'sop' },
  { label: '孔位图', value: 'pin_map' },
  { label: '成品图', value: 'finished_image' },
  { label: '连接器', value: 'connector' },
  { label: '前段参数', value: 'front_parameter' },
  { label: '后段资料', value: 'back_package' },
  { label: '治具', value: 'fixture' },
  { label: '异常', value: 'abnormal_case' },
  { label: '质量标准', value: 'quality_standard' },
  { label: '其他', value: 'other' },
]

const statuses = ['', '有效', '待确认', '失效', '缺失', '不一致', '启用', '异常']
const sources = [
  { label: '全部来源', value: '' },
  { label: '本地上传', value: 'manual_upload' },
  { label: '内置资料', value: 'mock' },
  { label: '知识库', value: 'knowledge' },
]
</script>

<template>
  <aside class="filter-panel">
    <section class="brand-card">
      <p>线束车间</p>
      <h1>资料查询上传中心</h1>
      <span>查询 / 上传 / 预览 / 管理</span>
    </section>

    <section class="panel-card">
      <div class="panel-title">
        <Filter :size="19" />
        <span>资料类型</span>
      </div>
      <div class="type-grid">
        <button
          v-for="item in typeOptions"
          :key="item.value"
          type="button"
          :class="{ active: !store.viewingTrash && store.filters.type === item.value }"
          @click="store.setType(item.value)"
        >
          {{ item.label }}
        </button>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-title">
        <FolderOpen :size="19" />
        <span>客户 / 产品 / 状态</span>
      </div>
      <PrimeInputText v-model="store.filters.customer" placeholder="客户名称" />
      <PrimeInputText v-model="store.filters.productCode" placeholder="产品编号" />
      <select v-model="store.filters.status" class="warm-select">
        <option v-for="status in statuses" :key="status" :value="status">
          {{ status || '全部状态' }}
        </option>
      </select>
      <select v-model="store.filters.source" class="warm-select" @change="store.setSource(store.filters.source)">
        <option v-for="source in sources" :key="source.value" :value="source.value">
          {{ source.label }}
        </option>
      </select>
      <PrimeButton label="应用筛选" class="w-full" @click="store.search()" />
    </section>

    <section class="panel-card trash-card" :class="{ active: store.viewingTrash }">
      <div class="panel-title">
        <ArchiveRestore :size="19" />
        <span>回收站</span>
      </div>
      <button type="button" class="trash-button" @click="store.enterTrash()">
        查看已删除资料
        <b>{{ store.trashItems.length }}</b>
      </button>
      <button v-if="store.viewingTrash" type="button" class="exit-trash" @click="store.exitTrash()">
        返回资料列表
      </button>
      <p class="empty-copy">
        <Database :size="14" />
        删除资料需要密码锁保护。
      </p>
    </section>
  </aside>
</template>

<style scoped>
.filter-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
  gap: 12px;
}

.brand-card,
.panel-card {
  border: 1px solid rgba(139, 90, 42, 0.2);
  border-radius: 16px;
  background: rgba(255, 249, 239, 0.78);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72), 0 12px 24px rgba(94, 53, 22, 0.1);
}

.brand-card {
  padding: 18px 16px;
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255, 252, 244, 0.96), rgba(255, 224, 176, 0.84));
  box-shadow: 0 18px 30px rgba(75, 38, 13, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.76);
}

.brand-card p,
.brand-card h1,
.brand-card span {
  margin: 0;
}

.brand-card p {
  color: #9b5125;
  font-size: 13px;
  font-weight: 950;
}

.brand-card h1 {
  margin-top: 4px;
  color: #342316;
  font-size: 26px;
  font-weight: 950;
  line-height: 1.08;
}

.brand-card span {
  display: block;
  margin-top: 8px;
  color: #7a4c23;
  font-size: 13px;
  font-weight: 900;
}

.panel-card {
  padding: 14px;
}

.trash-card {
  background: rgba(255, 240, 215, 0.82);
}

.trash-card.active {
  border-color: rgba(183, 74, 35, 0.38);
  box-shadow: 0 16px 26px rgba(132, 59, 24, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.75);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #5f351a;
  font-size: 16px;
  font-weight: 950;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.type-grid button,
.trash-button,
.exit-trash {
  border: 1px solid rgba(139, 90, 42, 0.16);
  border-radius: 12px;
  background: rgba(255, 246, 230, 0.8);
  color: #63411f;
  font-weight: 900;
  text-align: left;
}

.type-grid button {
  padding: 9px 10px;
  font-size: 14px;
}

.type-grid button.active {
  border-color: rgba(196, 95, 36, 0.45);
  background: linear-gradient(145deg, #d66b2c, #a84b24);
  color: #fff9ed;
  box-shadow: 0 10px 18px rgba(128, 62, 22, 0.22);
}

.warm-select {
  width: 100%;
  min-height: 42px;
  margin-bottom: 10px;
  padding: 0 11px;
  border: 1px solid rgba(139, 90, 42, 0.22);
  border-radius: 10px;
  background: rgba(255, 248, 235, 0.9);
  color: #432813;
  font-weight: 850;
}

.panel-card :deep(.p-inputtext) {
  width: 100%;
  margin-bottom: 8px;
}

.trash-button,
.exit-trash {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 9px;
  padding: 12px;
  font-size: 15px;
}

.trash-button b {
  display: grid;
  place-items: center;
  min-width: 30px;
  height: 30px;
  border-radius: 999px;
  background: #c45f24;
  color: #fff8ed;
}

.exit-trash {
  justify-content: center;
  color: #7b421f;
}

.empty-copy {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: #9a7146;
  font-size: 13px;
  font-weight: 850;
}
</style>
