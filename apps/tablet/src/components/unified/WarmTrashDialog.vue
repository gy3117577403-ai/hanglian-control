<script setup lang="ts">
import { onMounted } from 'vue'
import { RotateCcw, ShieldAlert, Trash2 } from 'lucide-vue-next'
import { useUnifiedDocumentStore } from '@/stores/unified-document-store'
import type { UnifiedDocumentItem } from '@/types/production'
import WarmBulkActionBar from './WarmBulkActionBar.vue'

const visible = defineModel<boolean>('visible', { required: true })
const store = useUnifiedDocumentStore()

const emit = defineEmits<{
  purge: [item: UnifiedDocumentItem]
  bulkPurge: []
}>()

onMounted(() => {
  void store.loadTrash()
})
</script>

<template>
  <PrimeDialog v-model:visible="visible" modal header="回收站" :style="{ width: '900px' }">
    <WarmBulkActionBar
      :count="store.selectedCount"
      in-trash
      class="mb-3"
      @restore="store.bulkRestore('回收站批量恢复')"
      @purge="emit('bulkPurge')"
      @clear="store.clearSelection"
    />

    <div class="trash-list">
      <article v-for="item in store.trashItems" :key="item.id" class="trash-row">
        <input
          type="checkbox"
          :checked="store.selectedIds.includes(item.id)"
          @change="store.toggleSelected(item.id)"
        >
        <div class="trash-icon">
          <Trash2 :size="20" />
        </div>
        <div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.subtitle }}</p>
          <small>删除时间：{{ item.deletedAt || '未记录' }}</small>
        </div>
        <div class="trash-actions">
          <PrimeButton severity="success" outlined @click="store.restoreItem(item.id, '回收站恢复')">
            <RotateCcw :size="17" />
            <span>恢复</span>
          </PrimeButton>
          <PrimeButton severity="danger" outlined @click="emit('purge', item)">
            <ShieldAlert :size="17" />
            <span>彻底删除</span>
          </PrimeButton>
        </div>
      </article>
    </div>

    <div v-if="!store.trashItems.length" class="empty-trash">
      <Trash2 :size="38" />
      <h3>回收站为空</h3>
      <p>移入回收站的资料会显示在这里，文件不会立即删除。</p>
    </div>
  </PrimeDialog>
</template>

<style scoped>
.trash-list {
  display: flex;
  flex-direction: column;
  max-height: 560px;
  gap: 10px;
  overflow: auto;
}

.trash-row {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid rgba(139, 90, 42, 0.18);
  border-radius: 14px;
  background: rgba(255, 246, 231, 0.86);
}

input {
  width: 20px;
  height: 20px;
  accent-color: #c65f24;
}

.trash-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: rgba(196, 95, 36, 0.14);
  color: #9b441f;
}

h3,
p {
  margin: 0;
}

h3 {
  color: #342316;
  font-size: 17px;
  font-weight: 950;
}

p,
small {
  color: #75512b;
  font-weight: 850;
}

.trash-actions {
  display: flex;
  gap: 8px;
}

.empty-trash {
  display: grid;
  place-items: center;
  min-height: 240px;
  color: #8a6239;
  text-align: center;
}
</style>
