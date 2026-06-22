<script setup lang="ts">
import { Cable, FileStack, Folders, LibraryBig, Search, UploadCloud, Wrench } from 'lucide-vue-next'
import WarmHubSearchBar from '@/components/hub/WarmHubSearchBar.vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { HubMode } from '@/types/production'
import WarmNativeMoreMenu from './WarmNativeMoreMenu.vue'

const store = useDocumentHubStore()

const emit = defineEmits<{
  'open-network': []
  'open-pdf-import': []
  'open-maintenance': []
  'open-trash': []
}>()

const modeOptions: Array<{ mode: HubMode; label: string; icon: typeof FileStack }> = [
  { mode: 'drawing', label: '图纸', icon: FileStack },
  { mode: 'connector', label: '连接器', icon: Cable },
  { mode: 'fixture', label: '治具', icon: Wrench },
]

function setMode(mode: HubMode) {
  store.setActiveMode(mode)
}
</script>

<template>
  <header class="hub-header native-header">
    <div class="native-header-row primary">
      <div class="native-brand-chip">
        <LibraryBig :size="21" />
        <span>资料工作台</span>
      </div>
      <div class="native-header-search">
        <WarmHubSearchBar />
      </div>
      <button type="button" class="native-action-button" @click="store.searchCurrentMode()">
        <Search :size="18" />
        <span>搜索</span>
      </button>
    </div>

    <div class="native-header-row secondary">
      <div class="native-mode-tabs">
        <button
          v-for="item in modeOptions"
          :key="item.mode"
          type="button"
          class="native-mode-button"
          :class="{ active: store.activeMode === item.mode }"
          @click="setMode(item.mode)"
        >
          <component :is="item.icon" :size="18" />
          <span>{{ item.label }}</span>
        </button>
      </div>

      <div aria-hidden="true" />

      <div class="native-action-cluster">
        <button
          v-if="store.activeMode === 'drawing'"
          type="button"
          class="native-action-button pdf primary"
          @click="emit('open-pdf-import')"
        >
          <FileStack :size="18" />
          <span>导入 PDF</span>
        </button>
        <button
          v-if="store.activeMode === 'drawing'"
          type="button"
          class="native-action-button maintenance"
          title="客户与产品资料"
          @click="emit('open-maintenance')"
        >
          <Folders :size="18" />
          <span>客户与产品</span>
        </button>
        <button type="button" class="native-action-button" @click="store.openTopUpload()">
          <UploadCloud :size="18" />
          <span>上传资料</span>
        </button>
        <WarmNativeMoreMenu
          :drawing-mode="store.activeMode === 'drawing'"
          :drawing-trash-total="store.drawingTrashTotal"
          @open-network="emit('open-network')"
          @open-trash="emit('open-trash')"
          @open-order-overview="store.openOrderOverview()"
        />
      </div>
    </div>
  </header>
</template>
