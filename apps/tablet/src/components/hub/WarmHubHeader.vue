<script setup lang="ts">
import { ClipboardList, UploadCloud } from 'lucide-vue-next'
import WarmFunctionOrb from './WarmFunctionOrb.vue'
import WarmHubSearchBar from './WarmHubSearchBar.vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
</script>

<template>
  <header class="hub-header">
    <div class="header-toolbox">
      <WarmFunctionOrb :active-mode="store.activeMode" @select="store.setActiveMode" />
      <WarmHubSearchBar />
    </div>
    <div class="header-actions">
      <PrimeButton class="upload-button" title="上传资料" aria-label="上传资料" @click="store.openTopUpload()">
        <UploadCloud :size="18" />
      </PrimeButton>
      <PrimeButton severity="secondary" outlined title="订单总览" aria-label="订单总览" @click="store.orderOverviewOpen = true">
        <ClipboardList :size="18" />
      </PrimeButton>
    </div>
  </header>
</template>

<style scoped>
.hub-header {
  position: relative;
  z-index: 40;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 11px;
  align-items: center;
  min-height: 62px;
}

.header-toolbox {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 9px;
  align-items: center;
  min-width: 0;
  overflow: visible;
  padding: 6px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 21px;
  background:
    linear-gradient(112deg, rgba(255, 255, 255, 0.76), rgba(255, 255, 255, 0.1) 32%, transparent 58%),
    linear-gradient(292deg, rgba(92, 143, 137, 0.18), rgba(92, 143, 137, 0.04) 50%, transparent 68%),
    rgba(255, 255, 255, 0.055);
  box-shadow:
    0 30px 62px rgba(75, 38, 13, 0.16),
    0 8px 22px rgba(255, 255, 255, 0.22) inset,
    0 0 0 1px rgba(127, 82, 38, 0.045),
    0 2px 0 rgba(255, 255, 255, 0.96) inset,
    24px 0 48px rgba(255, 255, 255, 0.24) inset,
    -18px -12px 42px rgba(90, 132, 126, 0.1) inset,
    inset 0 -16px 34px rgba(156, 83, 34, 0.018);
  backdrop-filter: blur(36px) saturate(1.4);
  -webkit-backdrop-filter: blur(36px) saturate(1.4);
}

.header-toolbox::before,
.header-toolbox::after {
  position: absolute;
  content: '';
  pointer-events: none;
}

.header-toolbox::before {
  inset: 1px;
  border-radius: 20px;
  background:
    linear-gradient(112deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.12) 32%, transparent 52%),
    linear-gradient(290deg, rgba(102, 145, 138, 0.16), transparent 48%);
}

.header-toolbox::after {
  inset: -70% auto auto 16%;
  width: 46%;
  height: 220%;
  border-radius: 999px;
  background: linear-gradient(92deg, transparent, rgba(255, 255, 255, 0.36), transparent);
  transform: rotate(13deg);
}

.header-toolbox > * {
  position: relative;
  z-index: 1;
}

.header-toolbox :deep(.orb-wrap) {
  z-index: 24;
}

.header-toolbox :deep(.orb-wrap.expanded) {
  z-index: 96;
}

.header-actions {
  display: flex;
  gap: 7px;
  align-items: center;
}

.header-actions :deep(.p-button) {
  width: 46px;
  min-width: 46px;
  min-height: 46px;
  padding: 0;
  border-radius: 14px;
  font-weight: 950;
  border-color: rgba(255, 255, 255, 0.78);
  background:
    linear-gradient(122deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.09) 50%),
    linear-gradient(300deg, rgba(102, 146, 140, 0.15), transparent 60%),
    rgba(255, 255, 255, 0.08);
  box-shadow:
    0 20px 38px rgba(75, 38, 13, 0.15),
    0 8px 18px rgba(255, 255, 255, 0.22) inset,
    0 2px 0 rgba(255, 255, 255, 0.9) inset,
    0 -10px 24px rgba(127, 70, 34, 0.065) inset;
  backdrop-filter: blur(32px) saturate(1.34);
  -webkit-backdrop-filter: blur(32px) saturate(1.34);
}

.upload-button {
  border-color: rgba(255, 255, 255, 0.76);
  background:
    linear-gradient(120deg, rgba(255, 255, 255, 0.56), rgba(255, 255, 255, 0.09) 46%),
    linear-gradient(145deg, rgba(229, 127, 50, 0.58), rgba(176, 78, 30, 0.48)),
    rgba(255, 255, 255, 0.16);
  box-shadow:
    0 18px 30px rgba(141, 68, 22, 0.27),
    inset 0 1px 0 rgba(255, 255, 255, 0.66),
    inset 0 -14px 24px rgba(101, 43, 16, 0.16);
}

@media (max-width: 1320px) {
  .hub-header {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
  }

  .header-actions :deep(.p-button) {
    width: 42px;
    min-width: 42px;
    min-height: 42px;
  }

  .header-toolbox {
    backdrop-filter: blur(12px) saturate(1.08);
    -webkit-backdrop-filter: blur(12px) saturate(1.08);
  }
}
</style>
