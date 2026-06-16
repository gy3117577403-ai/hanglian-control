<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
</script>

<template>
  <form class="hub-search" @submit.prevent="store.searchCurrentMode()">
    <Search :size="21" />
    <PrimeInputText v-model="store.searchKeyword" :placeholder="store.currentSearchPlaceholder" />
    <PrimeButton label="搜索" type="submit" />
  </form>
</template>

<style scoped>
.hub-search {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 9px;
  align-items: center;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid rgba(139, 90, 42, 0.2);
  border-radius: 16px;
  background: rgba(255, 249, 238, 0.88);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72), 0 10px 18px rgba(92, 51, 19, 0.1);
  color: #8f4a22;
}

.hub-search :deep(.p-inputtext) {
  min-height: 46px;
  border: 0;
  background: transparent;
  font-size: 16px;
  font-weight: 850;
  box-shadow: none;
}

.hub-search :deep(.p-button) {
  min-height: 42px;
  border-radius: 12px;
  font-weight: 950;
}
</style>
