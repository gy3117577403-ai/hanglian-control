<script setup lang="ts">
import WarmLandscapeGuard from '@/components/system/WarmLandscapeGuard.vue'
import WarmDocumentHubDashboard from '@/components/hub/WarmDocumentHubDashboard.vue'
</script>

<template>
  <div class="warm-shell document-hub-page">
    <WarmDocumentHubDashboard />
    <PrimeToast position="top-right" />
    <PrimeConfirmDialog />
    <WarmLandscapeGuard />
  </div>
</template>

<style scoped>
.document-hub-page {
  min-width: 1180px;
}
</style>
