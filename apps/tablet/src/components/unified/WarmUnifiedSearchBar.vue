<script setup lang="ts">
import { Search, Trash2, UploadCloud } from 'lucide-vue-next'
import { ref, watch } from 'vue'

const props = defineProps<{
  keyword: string
  trashCount: number
  lockReady: boolean
}>()

const emit = defineEmits<{
  search: [value: string]
  upload: []
  trash: []
}>()

const value = ref(props.keyword)

watch(() => props.keyword, (next) => {
  value.value = next
})

function submit() {
  emit('search', value.value)
}
</script>

<template>
  <header class="unified-search-bar">
    <div>
      <p class="eyebrow">统一资料中心</p>
      <h1>线束车间资料查询上传中心</h1>
    </div>

    <form class="search-box" @submit.prevent="submit">
      <Search :size="24" />
      <PrimeInputText
        v-model="value"
        class="search-input"
        placeholder="搜索客户、产品编号、图纸、SOP、孔位图、成品图、治具、异常、质量标准"
      />
      <PrimeButton label="查询" type="submit" />
    </form>

    <div class="action-cluster">
      <PrimeButton class="primary-action" @click="emit('upload')">
        <UploadCloud :size="20" />
        <span>上传资料</span>
      </PrimeButton>
      <PrimeButton severity="secondary" outlined @click="emit('trash')">
        <Trash2 :size="19" />
        <span>回收站 {{ trashCount }}</span>
      </PrimeButton>
      <span class="lock-pill" :class="{ ready: lockReady }">
        {{ lockReady ? '删除锁已启用' : '首次删除需设置密码' }}
      </span>
    </div>
  </header>
</template>

<style scoped>
.unified-search-bar {
  display: grid;
  grid-template-columns: 270px minmax(360px, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 18px;
  border: 1px solid rgba(139, 90, 42, 0.22);
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255, 252, 244, 0.95), rgba(255, 230, 190, 0.78));
  box-shadow: 0 18px 34px rgba(75, 38, 13, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.eyebrow {
  font-size: 13px;
  font-weight: 950;
  color: #9b5125;
}

h1 {
  margin: 2px 0 0;
  color: #342316;
  font-size: clamp(24px, 2.25vw, 36px);
  font-weight: 950;
  letter-spacing: 0;
  line-height: 1.05;
}

.search-box {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid rgba(139, 90, 42, 0.22);
  border-radius: 16px;
  background: rgba(255, 248, 235, 0.9);
  color: #8b4c23;
}

.search-input {
  width: 100%;
  min-height: 46px;
  font-size: 17px;
  font-weight: 850;
}

.action-cluster {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}

.primary-action,
.action-cluster :deep(.p-button) {
  min-height: 48px;
  font-weight: 950;
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

@media (max-width: 1320px) {
  .unified-search-bar {
    grid-template-columns: 240px minmax(320px, 1fr);
  }

  .action-cluster {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}
</style>
