<script setup lang="ts">
import WarmConnectorParameterView from '@/components/connector/WarmConnectorParameterView.vue'
import WarmDrawingLibraryView from '@/components/drawing/WarmDrawingLibraryView.vue'
import WarmFixtureParameterView from '@/components/fixture/WarmFixtureParameterView.vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
</script>

<template>
  <section class="hub-content">
    <WarmDrawingLibraryView v-if="store.activeMode === 'drawing'" />
    <WarmConnectorParameterView v-else-if="store.activeMode === 'connector'" />
    <WarmFixtureParameterView v-else />
  </section>
</template>

<style scoped>
.hub-content {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(139, 90, 42, 0.18);
  border-radius: 20px;
  background: rgba(255, 250, 241, 0.78);
  box-shadow: 0 18px 34px rgba(75, 38, 13, 0.13), inset 0 1px 0 rgba(255, 255, 255, 0.75);
}
</style>
