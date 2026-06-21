<script setup lang="ts">
import { computed } from 'vue'
import WarmDrawingSearchResultItem from './WarmDrawingSearchResultItem.vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { DrawingSearchResult } from '@/types/drawing-search'

const store = useDocumentHubStore()

const groups = computed(() => [
  { key: 'customers', label: '客户', items: store.searchGroupedResults.customers },
  { key: 'products', label: '产品型号', items: store.searchGroupedResults.products },
  { key: 'documents', label: '资料', items: store.searchGroupedResults.documents },
])

const hasResults = computed(() => store.searchResults.length > 0)
const hasQuery = computed(() => store.searchQuery.trim().length > 0)

function selectResult(result: DrawingSearchResult) {
  void store.openSearchResult(result)
}

function resultKey(result: DrawingSearchResult) {
  if (result.resultType === 'customer') return `customer-${result.customerId}`
  if (result.resultType === 'product') return `product-${result.productId}`
  return `document-${result.documentId || result.itemId}`
}
</script>

<template>
  <section class="drawing-search-results" @click.stop>
    <div v-if="store.searchLoading" class="search-state">正在查询资料...</div>
    <div v-else-if="store.searchError" class="search-state error">资料查询失败，请检查网络后重试。</div>
    <div v-else-if="hasQuery && !hasResults" class="search-state">未找到相关客户、产品或资料。</div>
    <div v-else class="result-scroll" data-drawing-search-scroll>
      <template v-for="group in groups" :key="group.key">
        <div v-if="group.items.length" class="result-group">
          <div class="group-title">{{ group.label }}</div>
          <WarmDrawingSearchResultItem
            v-for="item in group.items"
            :key="resultKey(item)"
            :result="item"
            @select="selectResult"
          />
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.drawing-search-results {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 80;
  min-width: 460px;
  max-height: min(58vh, 520px);
  padding: 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 16px;
  background:
    linear-gradient(118deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.48)),
    rgba(247, 242, 229, 0.88);
  box-shadow: 0 22px 52px rgba(72, 39, 18, 0.18);
  backdrop-filter: blur(18px) saturate(1.18);
  -webkit-backdrop-filter: blur(18px) saturate(1.18);
}

.result-scroll {
  display: grid;
  gap: 10px;
  max-height: calc(min(58vh, 520px) - 20px);
  overflow-y: auto;
  overflow-x: hidden;
}

.result-group {
  display: grid;
  gap: 4px;
}

.group-title {
  padding: 0 8px 2px;
  color: rgba(82, 48, 30, 0.62);
  font-size: 12px;
  font-weight: 950;
}

.search-state {
  display: grid;
  min-height: 56px;
  place-items: center;
  color: rgba(82, 48, 30, 0.72);
  font-size: 14px;
  font-weight: 850;
}

.search-state.error {
  color: #9b351d;
}

@media (max-width: 900px) {
  .drawing-search-results {
    min-width: 0;
  }
}
</style>
