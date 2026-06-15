<script setup lang="ts">
import WarmLandscapeGuard from '@/components/system/WarmLandscapeGuard.vue'
import WarmUnifiedDocumentCenter from '@/components/unified/WarmUnifiedDocumentCenter.vue'
</script>

<template>
  <div class="warm-shell unified-document-shell">
    <WarmUnifiedDocumentCenter />
    <PrimeToast position="top-right" />
    <PrimeConfirmDialog />
    <WarmLandscapeGuard />
  </div>
</template>

<style scoped>
.unified-document-shell {
  min-width: 1180px;
}
</style>
