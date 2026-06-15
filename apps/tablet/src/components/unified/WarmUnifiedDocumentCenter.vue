<script setup lang="ts">
import { onMounted, ref } from 'vue'
import WarmBulkActionBar from './WarmBulkActionBar.vue'
import WarmDeleteLockSetupDialog from './WarmDeleteLockSetupDialog.vue'
import WarmDeletePasswordDialog, { type DeleteDialogAction } from './WarmDeletePasswordDialog.vue'
import WarmTrashDialog from './WarmTrashDialog.vue'
import WarmUnifiedEditDialog from './WarmUnifiedEditDialog.vue'
import WarmUnifiedFilterPanel from './WarmUnifiedFilterPanel.vue'
import WarmUnifiedPreviewPanel from './WarmUnifiedPreviewPanel.vue'
import WarmUnifiedResultList from './WarmUnifiedResultList.vue'
import WarmUnifiedSearchBar from './WarmUnifiedSearchBar.vue'
import { useUnifiedDocumentStore } from '@/stores/unified-document-store'
import type { UnifiedDocumentItem } from '@/types/production'

const store = useUnifiedDocumentStore()
const passwordDialogOpen = ref(false)
const setupDialogOpen = ref(false)
const pendingAction = ref<DeleteDialogAction | null>(null)
const pendingItem = ref<UnifiedDocumentItem | null>(null)

onMounted(() => {
  void store.initialize()
})

async function prepareAction(action: DeleteDialogAction, item?: UnifiedDocumentItem) {
  pendingAction.value = action
  pendingItem.value = item ?? null
  await store.refreshDeleteLockStatus()
  if (!store.deleteLockStatus?.hasPassword) {
    setupDialogOpen.value = true
    return
  }
  passwordDialogOpen.value = true
}

function requestDelete(item: UnifiedDocumentItem) {
  void prepareAction({ mode: 'delete', title: `移入回收站：${item.title}` }, item)
}

function requestPurge(item: UnifiedDocumentItem) {
  void prepareAction({ mode: 'purge', title: `彻底删除：${item.title}` }, item)
}

async function editItem(item: UnifiedDocumentItem) {
  await store.selectItem(item.id)
  store.editDialogOpen = true
}

function requestBulkDelete() {
  void prepareAction({ mode: 'bulk-delete', title: '批量移入回收站', count: store.selectedCount })
}

function requestBulkPurge() {
  void prepareAction({ mode: 'bulk-purge', title: '批量彻底删除', count: store.selectedCount })
}

async function setEffective(item: UnifiedDocumentItem) {
  await store.selectItem(item.id)
  await store.setEffectiveCurrent()
}

async function submitPassword(payload: { password: string; reason?: string; confirmText?: string }) {
  if (!pendingAction.value) return
  const mode = pendingAction.value.mode
  if (mode === 'delete' && pendingItem.value) {
    await store.deleteItem(pendingItem.value.id, payload.password, payload.reason)
  }
  if (mode === 'purge' && pendingItem.value) {
    await store.purgeItem(pendingItem.value.id, payload.password, payload.confirmText ?? '', payload.reason)
  }
  if (mode === 'bulk-delete') {
    await store.bulkDelete(payload.password, payload.reason)
  }
  if (mode === 'bulk-purge') {
    await store.bulkPurge(payload.password, payload.confirmText ?? '', payload.reason)
  }
  passwordDialogOpen.value = false
  pendingAction.value = null
  pendingItem.value = null
}

function afterSetup() {
  setupDialogOpen.value = false
  if (pendingAction.value) passwordDialogOpen.value = true
}
</script>

<template>
  <div class="unified-center">
    <WarmUnifiedSearchBar
      :keyword="store.keyword"
      :trash-count="store.trashItems.length"
      :lock-ready="Boolean(store.deleteLockStatus?.hasPassword)"
      @search="store.search"
      @upload="store.uploadDialogOpen = true"
      @trash="store.trashDialogOpen = true"
    />

    <main class="unified-grid">
      <WarmUnifiedFilterPanel />
      <section class="result-stack">
        <WarmBulkActionBar
          :count="store.selectedCount"
          @delete="requestBulkDelete"
          @purge="requestBulkPurge"
          @clear="store.clearSelection"
        />
        <WarmUnifiedResultList
          @edit="editItem"
          @delete="requestDelete"
          @purge="requestPurge"
          @effective="setEffective"
        />
      </section>
      <WarmUnifiedPreviewPanel />
    </main>

    <WarmUnifiedUploadDialog v-model:visible="store.uploadDialogOpen" />
    <WarmUnifiedEditDialog v-model:visible="store.editDialogOpen" />
    <WarmTrashDialog
      v-model:visible="store.trashDialogOpen"
      @purge="requestPurge"
      @bulk-purge="requestBulkPurge"
    />
    <WarmDeletePasswordDialog
      v-model:visible="passwordDialogOpen"
      :action="pendingAction"
      @submit="submitPassword"
    />
    <WarmDeleteLockSetupDialog v-model:visible="setupDialogOpen" @saved="afterSetup" />
  </div>
</template>

<style scoped>
.unified-center {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  height: 100vh;
  padding: 14px;
}

.unified-grid {
  display: grid;
  grid-template-columns: 260px minmax(440px, 1.1fr) minmax(360px, 0.9fr);
  min-height: 0;
  gap: 14px;
}

.result-stack {
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 10px;
}

@media (max-width: 1320px) {
  .unified-grid {
    grid-template-columns: 244px minmax(420px, 1fr) minmax(310px, 0.86fr);
  }
}
</style>
