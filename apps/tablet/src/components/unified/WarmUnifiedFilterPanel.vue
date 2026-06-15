<script setup lang="ts">
import { Clock3, Filter, FolderOpen, UploadCloud } from 'lucide-vue-next'
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
  { label: '其他资料', value: 'other' },
]

const statuses = ['', '有效', '待确认', '失效', '缺失', '不一致', '启用', '异常']
</script>

<template>
  <aside class="filter-panel">
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
          :class="{ active: store.filters.type === item.value }"
          @click="store.setType(item.value)"
        >
          {{ item.label }}
        </button>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-title">
        <FolderOpen :size="19" />
        <span>客户 / 产品筛选</span>
      </div>
      <PrimeInputText v-model="store.filters.customer" placeholder="客户名称" />
      <PrimeInputText v-model="store.filters.productCode" placeholder="产品编号" />
      <select v-model="store.filters.status" class="warm-select">
        <option v-for="status in statuses" :key="status" :value="status">
          {{ status || '全部状态' }}
        </option>
      </select>
      <PrimeButton label="应用筛选" class="w-full" @click="store.search()" />
    </section>

    <section class="panel-card compact">
      <div class="panel-title">
        <Clock3 :size="19" />
        <span>最近查询</span>
      </div>
      <button
        v-for="query in store.recentQueries"
        :key="query"
        type="button"
        class="history-row"
        @click="store.search(query)"
      >
        {{ query }}
      </button>
      <p v-if="!store.recentQueries.length" class="empty-copy">暂无查询记录</p>
    </section>

    <section class="panel-card compact">
      <div class="panel-title">
        <UploadCloud :size="19" />
        <span>上传记录</span>
      </div>
      <button
        v-for="log in store.uploadLogs"
        :key="log.id"
        type="button"
        class="history-row"
        @click="store.selectItem(log.id)"
      >
        <strong>{{ log.title }}</strong>
        <small>{{ log.time }}</small>
      </button>
      <p v-if="!store.uploadLogs.length" class="empty-copy">暂无上传记录</p>
    </section>
  </aside>
</template>

<style scoped>
.filter-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 12px;
}

.panel-card {
  padding: 14px;
  border: 1px solid rgba(139, 90, 42, 0.2);
  border-radius: 16px;
  background: rgba(255, 249, 239, 0.78);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72), 0 12px 24px rgba(94, 53, 22, 0.1);
}

.compact {
  min-height: 124px;
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
.history-row {
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
  margin-top: 8px;
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

.history-row {
  display: block;
  width: 100%;
  margin-bottom: 7px;
  padding: 9px 10px;
  font-size: 13px;
}

.history-row strong,
.history-row small {
  display: block;
}

.history-row small {
  margin-top: 2px;
  color: #8b673e;
}

.empty-copy {
  margin: 0;
  color: #9a7146;
  font-size: 13px;
  font-weight: 850;
}
</style>
