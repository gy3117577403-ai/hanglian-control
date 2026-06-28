<script setup lang="ts">
import { onMounted, ref } from 'vue'
import WarmBulkActionBar from './WarmBulkActionBar.vue'
import WarmDeleteLockSetupDialog from './WarmDeleteLockSetupDialog.vue'
import WarmDeletePasswordDialog, { type DeleteDialogAction } from './WarmDeletePasswordDialog.vue'
import WarmUnifiedEditDialog from './WarmUnifiedEditDialog.vue'
import WarmUnifiedFilterPanel from './WarmUnifiedFilterPanel.vue'
import WarmUnifiedPreviewPanel from './WarmUnifiedPreviewPanel.vue'
import WarmUnifiedResultList from './WarmUnifiedResultList.vue'
import WarmUnifiedSearchBar from './WarmUnifiedSearchBar.vue'
import WarmUnifiedUploadDialog from './WarmUnifiedUploadDialog.vue'
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

async function restoreItem(item: UnifiedDocumentItem) {
  await store.restoreItem(item.id, '回收站列表恢复')
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
    <main class="unified-grid">
      <WarmUnifiedFilterPanel />
      <section class="middle-column">
        <WarmUnifiedSearchBar
          :keyword="store.keyword"
          :lock-ready="Boolean(store.deleteLockStatus?.hasPassword)"
          @search="store.search"
          @upload="store.uploadDialogOpen = true"
        />
        <WarmBulkActionBar
          :count="store.selectedCount"
          :in-trash="store.viewingTrash"
          @delete="requestBulkDelete"
          @restore="store.bulkRestore('回收站批量恢复')"
          @purge="requestBulkPurge"
          @clear="store.clearSelection"
        />
        <WarmUnifiedResultList
          @edit="editItem"
          @delete="requestDelete"
          @restore="restoreItem"
          @purge="requestPurge"
          @effective="setEffective"
        />
      </section>
      <WarmUnifiedPreviewPanel
        @edit="editItem"
        @delete="requestDelete"
        @restore="restoreItem"
        @purge="requestPurge"
        @effective="setEffective"
      />
    </main>

    <WarmUnifiedUploadDialog v-model:visible="store.uploadDialogOpen" />
    <WarmUnifiedEditDialog v-model:visible="store.editDialogOpen" />
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
  height: 100vh;
  padding: 14px;
}

.unified-grid {
  display: grid;
  grid-template-columns: 278px minmax(430px, 0.96fr) minmax(450px, 1.04fr);
  height: 100%;
  min-height: 0;
  gap: 14px;
}

.middle-column {
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 10px;
}

@media (max-width: 1320px) {
  .unified-grid {
    grid-template-columns: 252px minmax(410px, 0.98fr) minmax(360px, 1.02fr);
    gap: 10px;
  }

  .unified-center {
    padding: 10px;
  }
}
</style>
