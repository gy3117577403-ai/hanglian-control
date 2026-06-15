<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
</script>

<template>
  <form class="hub-search" @submit.prevent="store.searchCurrentMode()">
    <Search :size="22" />
    <PrimeInputText v-model="store.searchKeyword" :placeholder="store.currentSearchPlaceholder" />
    <PrimeButton label="搜索" type="submit" />
  </form>
</template>

<style scoped>
.hub-search {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-width: 420px;
  padding: 9px 11px;
  border: 1px solid rgba(139, 90, 42, 0.2);
  border-radius: 16px;
  background: rgba(255, 249, 238, 0.86);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72), 0 12px 22px rgba(92, 51, 19, 0.1);
  color: #8f4a22;
}

.hub-search :deep(.p-inputtext) {
  min-height: 48px;
  border: 0;
  background: transparent;
  font-size: 17px;
  font-weight: 850;
  box-shadow: none;
}

@media (max-width: 1320px) {
  .hub-search {
    min-width: 360px;
  }
}
</style>
