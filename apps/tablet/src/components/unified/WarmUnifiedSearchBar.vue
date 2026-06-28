<script setup lang="ts">
import { Search, UploadCloud } from 'lucide-vue-next'
import { ref, watch } from 'vue'
import { useUnifiedDocumentStore } from '@/stores/unified-document-store'

const props = defineProps<{
  keyword: string
  lockReady: boolean
}>()

const emit = defineEmits<{
  search: [value: string]
  upload: []
}>()

const store = useUnifiedDocumentStore()
const value = ref(props.keyword)
type SortBy = 'updated' | 'type' | 'productCode' | 'status'

watch(() => props.keyword, (next) => {
  value.value = next
})

function submit() {
  emit('search', value.value)
}

function changeSort(event: Event) {
  store.setSort((event.target as HTMLSelectElement).value as SortBy)
}
</script>

<template>
  <header class="unified-search-bar">
    <form class="search-box" @submit.prevent="submit">
      <Search :size="25" />
      <PrimeInputText
        v-model="value"
        class="search-input"
        placeholder="搜索客户、产品编号、图纸、SOP、孔位图、成品图、治具、异常、质量标准"
      />
      <PrimeButton label="查询" type="submit" />
    </form>

    <div class="action-cluster">
      <PrimeButton class="primary-action" @click="emit('upload')">
        <UploadCloud :size="21" />
        <span>上传资料</span>
      </PrimeButton>
      <label class="sort-control">
        <span>排序</span>
        <select v-model="store.sortBy" @change="changeSort">
          <option value="updated">最近更新</option>
          <option value="type">资料类型</option>
          <option value="productCode">产品编号</option>
          <option value="status">状态</option>
        </select>
      </label>
      <span class="lock-pill" :class="{ ready: lockReady }">
        {{ lockReady ? '删除密码锁已启用' : '删除密码锁未设置' }}
      </span>
    </div>

    <div class="recent-strip">
      <span>最近查询</span>
      <button
        v-for="query in store.recentQueries"
        :key="query"
        type="button"
        @click="emit('search', query)"
      >
        {{ query }}
      </button>
      <small v-if="!store.recentQueries.length">暂无查询记录</small>
    </div>
  </header>
</template>

<style scoped>
.unified-search-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  padding: 14px;
  border: 1px solid rgba(139, 90, 42, 0.22);
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255, 252, 244, 0.95), rgba(255, 230, 190, 0.78));
  box-shadow: 0 18px 34px rgba(75, 38, 13, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.search-box {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid rgba(139, 90, 42, 0.22);
  border-radius: 16px;
  background: rgba(255, 248, 235, 0.9);
  color: #8b4c23;
}

.search-input {
  width: 100%;
  min-height: 50px;
  font-size: 18px;
  font-weight: 850;
}

.action-cluster {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
  white-space: nowrap;
}

.primary-action,
.action-cluster :deep(.p-button) {
  min-height: 52px;
  font-weight: 950;
}

.primary-action {
  padding-right: 20px;
  padding-left: 20px;
  border-color: rgba(143, 63, 29, 0.18);
  background: linear-gradient(145deg, #e38435, #bf531f);
  box-shadow: 0 16px 24px rgba(141, 68, 22, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.sort-control {
  display: grid;
  gap: 4px;
  color: #6e421f;
  font-size: 12px;
  font-weight: 950;
}

.sort-control select {
  min-height: 34px;
  border: 1px solid rgba(139, 90, 42, 0.2);
  border-radius: 9px;
  background: rgba(255, 248, 235, 0.92);
  color: #432813;
  font-weight: 900;
}

.lock-pill {
  padding: 9px 12px;
  border: 1px solid rgba(170, 87, 35, 0.25);
  border-radius: 999px;
  background: rgba(255, 239, 207, 0.76);
  color: #8c3f1f;
  font-size: 12px;
  font-weight: 950;
}

.lock-pill.ready {
  color: #35602b;
  border-color: rgba(75, 128, 58, 0.25);
  background: rgba(232, 244, 205, 0.72);
}

.recent-strip {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 7px;
  overflow: hidden;
}

.recent-strip span,
.recent-strip small,
.recent-strip button {
  color: #8b6238;
  font-size: 12px;
  font-weight: 900;
}

.recent-strip span {
  flex: 0 0 auto;
  color: #9b5125;
}

.recent-strip button {
  max-width: 128px;
  overflow: hidden;
  padding: 5px 8px;
  border: 1px solid rgba(139, 90, 42, 0.16);
  border-radius: 999px;
  background: rgba(255, 244, 225, 0.75);
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1320px) {
  .action-cluster {
    align-items: stretch;
  }

  .primary-action {
    flex: 1 1 auto;
  }

  .lock-pill {
    max-width: 136px;
    white-space: normal;
  }
}
</style>
