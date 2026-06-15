<script setup lang="ts">
import { onMounted } from 'vue'
import WarmHubContent from './WarmHubContent.vue'
import WarmHubHeader from './WarmHubHeader.vue'
import WarmHubUploadDialog from './WarmHubUploadDialog.vue'
import WarmOrderOverviewDialog from '@/components/orders/WarmOrderOverviewDialog.vue'
import WarmOrderSidebar from '@/components/orders/WarmOrderSidebar.vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()

onMounted(() => {
  void store.initialize()
})
</script>

<template>
  <div class="document-hub-shell">
    <WarmHubHeader />
    <main class="hub-body">
      <WarmOrderSidebar />
      <WarmHubContent />
    </main>
    <WarmOrderOverviewDialog />
    <WarmHubUploadDialog v-model:visible="store.uploadDialogOpen" />
  </div>
</template>

<style scoped>
.document-hub-shell {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  height: 100vh;
  padding: 12px;
  background:
    radial-gradient(circle at 20% 0%, rgba(255, 222, 159, 0.46), transparent 34%),
    linear-gradient(145deg, #fff7e9 0%, #f1dcc0 100%);
}

.hub-body {
  display: grid;
  grid-template-columns: 292px minmax(0, 1fr);
  min-height: 0;
  gap: 12px;
}

@media (max-width: 1320px) {
  .document-hub-shell {
    padding: 10px;
  }

  .hub-body {
    grid-template-columns: 270px minmax(0, 1fr);
    gap: 10px;
  }
}
</style>
