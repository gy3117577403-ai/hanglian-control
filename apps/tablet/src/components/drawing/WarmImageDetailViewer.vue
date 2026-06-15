<script setup lang="ts">
import { Maximize2 } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
</script>

<template>
  <div class="image-viewer">
    <section v-if="store.selectedDrawingItem" class="viewer-card">
      <div class="large-preview">
        <Maximize2 :size="48" />
        <b>{{ store.selectedDrawingItem.fileType.toUpperCase() }}</b>
      </div>
      <div class="viewer-info">
        <p>{{ store.selectedModule?.moduleName }}</p>
        <h2>{{ store.selectedDrawingItem.title }}</h2>
        <span>{{ store.selectedDrawingItem.fileName }}</span>
        <span>版本：{{ store.selectedDrawingItem.version }}</span>
        <span>来源：{{ store.selectedDrawingItem.source }}</span>
        <strong>{{ store.selectedDrawingItem.remark }}</strong>
      </div>
    </section>
  </div>
</template>

<style scoped>
.image-viewer {
  height: calc(100% - 58px);
  overflow: auto;
}

.viewer-card {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: 14px;
  min-height: 560px;
}

.large-preview,
.viewer-info {
  border: 1px solid rgba(139, 90, 42, 0.16);
  border-radius: 20px;
  background: rgba(255, 250, 241, 0.9);
  box-shadow: 0 16px 30px rgba(80, 42, 16, 0.12);
}

.large-preview {
  display: grid;
  place-items: center;
  color: #fff8ed;
  background: linear-gradient(145deg, #f5b65e, #be6427);
}

.large-preview b {
  font-size: 30px;
}

.viewer-info {
  padding: 18px;
}

p,
h2,
span,
strong {
  display: block;
  margin: 0;
}

p {
  color: #9b5125;
  font-weight: 950;
}

h2 {
  margin-top: 6px;
  color: #342112;
  font-size: 28px;
  font-weight: 950;
}

span,
strong {
  margin-top: 10px;
  color: #73512c;
  font-weight: 850;
}
</style>
