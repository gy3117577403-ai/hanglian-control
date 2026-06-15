<script setup lang="ts">
import { RotateCcw, ShieldAlert, Trash2, X } from 'lucide-vue-next'

defineProps<{
  count: number
  inTrash?: boolean
}>()

const emit = defineEmits<{
  delete: []
  restore: []
  purge: []
  clear: []
}>()
</script>

<template>
  <div v-if="count > 0" class="bulk-bar">
    <strong>已选择 {{ count }} 项</strong>
    <div class="bulk-actions">
      <PrimeButton v-if="!inTrash" severity="warning" outlined @click="emit('delete')">
        <Trash2 :size="17" />
        <span>批量移入回收站</span>
      </PrimeButton>
      <PrimeButton v-if="inTrash" severity="success" outlined @click="emit('restore')">
        <RotateCcw :size="17" />
        <span>批量恢复</span>
      </PrimeButton>
      <PrimeButton severity="danger" outlined @click="emit('purge')">
        <ShieldAlert :size="17" />
        <span>批量彻底删除</span>
      </PrimeButton>
      <PrimeButton severity="secondary" text @click="emit('clear')">
        <X :size="17" />
        <span>取消选择</span>
      </PrimeButton>
    </div>
  </div>
</template>

<style scoped>
.bulk-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(188, 88, 38, 0.22);
  border-radius: 14px;
  background: rgba(255, 237, 205, 0.84);
  color: #6e381b;
  box-shadow: 0 10px 20px rgba(118, 61, 26, 0.1);
}

.bulk-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
