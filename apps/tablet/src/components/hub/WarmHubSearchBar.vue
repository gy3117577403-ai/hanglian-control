<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Mic, Search, X } from 'lucide-vue-next'
import WarmDrawingSearchResults from '@/components/search/WarmDrawingSearchResults.vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
const root = ref<HTMLElement | null>(null)

function simulateVoiceQuery() {
  store.searchKeyword = store.activeMode === 'drawing'
    ? 'HL-CTRL-1907B 图纸'
    : store.activeMode === 'connector'
      ? 'CONN-16P'
      : 'JIG-HL'
  store.setSearchQuery(store.searchKeyword, { debounce: false })
  void store.searchCurrentMode()
}

function clearSearch() {
  store.clearSearch()
}

function submitSearch() {
  void store.searchCurrentMode()
}

function handleEscape() {
  if (store.searchOpen) {
    store.closeSearchResults()
    return
  }
  clearSearch()
}

function onDocumentPointerDown(event: PointerEvent) {
  const target = event.target as Node | null
  if (target && root.value?.contains(target)) return
  store.closeSearchResults()
}

watch(() => store.searchKeyword, (value) => {
  store.setSearchQuery(value)
})

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
})
</script>

<template>
  <div ref="root" class="hub-search-shell">
    <form class="hub-search" @submit.prevent="submitSearch" @keydown.esc.prevent="handleEscape" @focusin="store.openSearchPanel()">
      <Search :size="21" />
      <PrimeInputText v-model="store.searchKeyword" :placeholder="store.currentSearchPlaceholder" />
      <PrimeButton
        v-if="store.searchKeyword"
        class="clear-button"
        severity="secondary"
        text
        type="button"
        title="清空搜索"
        aria-label="清空搜索"
        @click="clearSearch"
      >
        <X :size="16" />
      </PrimeButton>
      <PrimeButton class="voice-button" severity="secondary" outlined type="button" title="语音输入" @click="simulateVoiceQuery">
        <Mic :size="17" />
        <span>按住说话</span>
      </PrimeButton>
      <PrimeButton label="搜索" type="submit" />
    </form>
    <WarmDrawingSearchResults v-if="store.activeMode === 'drawing' && store.searchOpen" />
  </div>
</template>

<style scoped>
.hub-search-shell {
  position: relative;
  z-index: 45;
  min-width: 0;
}

.hub-search {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto auto;
  gap: 7px;
  align-items: center;
  min-width: 0;
  padding: 5px 6px 5px 11px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 17px;
  background:
    linear-gradient(112deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.1) 38%, transparent 64%),
    linear-gradient(294deg, rgba(88, 138, 132, 0.16), rgba(88, 138, 132, 0.035) 54%, transparent),
    rgba(255, 255, 255, 0.06);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.98),
    inset 18px 0 36px rgba(255, 255, 255, 0.22),
    inset -14px -10px 34px rgba(92, 134, 128, 0.12),
    inset 0 -14px 28px rgba(193, 100, 38, 0.015),
    0 18px 38px rgba(92, 51, 19, 0.13),
    0 0 0 1px rgba(117, 74, 35, 0.045);
  color: #8f4a22;
  backdrop-filter: blur(24px) saturate(1.38);
  -webkit-backdrop-filter: blur(24px) saturate(1.38);
}

.hub-search::before {
  position: absolute;
  inset: 1px;
  z-index: -1;
  border-radius: 16px;
  background:
    linear-gradient(112deg, rgba(255, 255, 255, 0.94), transparent 28%),
    linear-gradient(292deg, rgba(89, 130, 124, 0.14), transparent 48%);
  content: '';
  pointer-events: none;
}

.hub-search::after {
  position: absolute;
  inset: -80% auto auto 24%;
  width: 36%;
  height: 230%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.26), transparent);
  content: '';
  pointer-events: none;
  transform: rotate(12deg);
}

.hub-search > * {
  position: relative;
  z-index: 1;
}

.hub-search :deep(.p-inputtext) {
  min-height: 40px;
  border: 0;
  background: transparent;
  font-size: 15px;
  font-weight: 850;
  box-shadow: none;
}

.hub-search :deep(.p-button) {
  min-height: 38px;
  border-radius: 11px;
  font-weight: 950;
}

.clear-button {
  width: 36px;
  min-width: 36px;
  padding: 0;
}

.clear-button :deep(.p-button-label) {
  display: none;
}

.voice-button span {
  font-size: 12px;
}

@media (max-width: 1320px) {
  .voice-button span {
    display: none;
  }

  .hub-search {
    backdrop-filter: blur(10px) saturate(1.06);
    -webkit-backdrop-filter: blur(10px) saturate(1.06);
  }
}
</style>
