<script setup lang="ts">
import { ClipboardList, UploadCloud } from 'lucide-vue-next'
import WarmFunctionOrb from './WarmFunctionOrb.vue'
import WarmHubSearchBar from './WarmHubSearchBar.vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
</script>

<template>
  <header class="hub-header">
    <WarmFunctionOrb :active-mode="store.activeMode" @select="store.setActiveMode" />
    <WarmHubSearchBar />
    <div class="header-actions">
      <PrimeButton class="upload-button" @click="store.uploadDialogOpen = true">
        <UploadCloud :size="19" />
        <span>上传资料</span>
      </PrimeButton>
      <PrimeButton severity="secondary" outlined @click="store.orderOverviewOpen = true">
        <ClipboardList :size="19" />
        <span>订单总览</span>
      </PrimeButton>
    </div>
  </header>
</template>

<style scoped>
.hub-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  min-height: 96px;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.header-actions :deep(.p-button) {
  min-height: 50px;
  border-radius: 14px;
  font-weight: 950;
}

.upload-button {
  border-color: rgba(143, 63, 29, 0.18);
  background: linear-gradient(145deg, #e38435, #bf531f);
  box-shadow: 0 14px 22px rgba(141, 68, 22, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

@media (max-width: 1320px) {
  .hub-header {
    gap: 10px;
  }
}
</style>
