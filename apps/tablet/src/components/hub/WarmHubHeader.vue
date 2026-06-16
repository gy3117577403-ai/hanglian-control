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
      <PrimeButton class="upload-button" @click="store.openTopUpload()">
        <UploadCloud :size="18" />
        <span>上传资料</span>
      </PrimeButton>
      <PrimeButton severity="secondary" outlined @click="store.orderOverviewOpen = true">
        <ClipboardList :size="18" />
        <span>订单总览</span>
      </PrimeButton>
    </div>
  </header>
</template>

<style scoped>
.hub-header {
  display: grid;
  grid-template-columns: 278px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 72px;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.header-actions :deep(.p-button) {
  min-height: 48px;
  border-radius: 14px;
  font-weight: 950;
}

.upload-button {
  border-color: rgba(143, 63, 29, 0.18);
  background: linear-gradient(145deg, #e38435, #bf531f);
  box-shadow: 0 12px 18px rgba(141, 68, 22, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

@media (max-width: 1320px) {
  .hub-header {
    grid-template-columns: 260px minmax(0, 1fr) auto;
    gap: 8px;
  }

  .header-actions :deep(.p-button) {
    padding-inline: 12px;
  }
}
</style>
