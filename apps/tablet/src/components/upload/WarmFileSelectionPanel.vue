<script setup lang="ts">
import { ref } from 'vue'
import { FileUp, X } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

function chooseFiles() {
  fileInput.value?.click()
}

function handleFiles(files?: FileList | null) {
  if (!files?.length) return
  store.addSelectedFiles(files)
  if (fileInput.value) fileInput.value.value = ''
}

function onDrop(event: DragEvent) {
  dragging.value = false
  handleFiles(event.dataTransfer?.files)
}
</script>

<template>
  <section class="file-panel">
    <div
      class="drop-zone"
      :class="{ dragging }"
      @dragenter.prevent="dragging = true"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <FileUp :size="30" />
      <div>
        <strong>选择文件或拖拽到此处</strong>
        <span>仅支持 PDF、JPG、PNG 和 WEBP 文件，单个文件不超过 30 MB，可一次选择多张图片。</span>
      </div>
      <PrimeButton label="选择文件" icon="pi pi-folder-open" @click="chooseFiles" />
      <input
        ref="fileInput"
        class="hidden-input"
        type="file"
        multiple
        accept="application/pdf,image/jpeg,image/png,image/webp"
        @change="handleFiles(($event.target as HTMLInputElement).files)"
      >
    </div>
    <p v-if="store.uploadError" class="upload-error">
      <X :size="14" />
      <span>{{ store.uploadError }}</span>
    </p>
  </section>
</template>

<style scoped>
.file-panel {
  display: grid;
  gap: 8px;
}

.drop-zone {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 118px;
  padding: 16px;
  border: 1px dashed rgba(139, 90, 42, 0.34);
  border-radius: 18px;
  background:
    linear-gradient(130deg, rgba(255, 255, 255, 0.7), rgba(255, 240, 216, 0.22)),
    rgba(255, 255, 255, 0.2);
  color: #432713;
  box-shadow:
    0 16px 30px rgba(80, 42, 16, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.drop-zone.dragging {
  border-color: rgba(182, 96, 40, 0.68);
  background:
    linear-gradient(130deg, rgba(255, 255, 255, 0.78), rgba(255, 226, 188, 0.34)),
    rgba(255, 255, 255, 0.32);
}

.drop-zone svg {
  color: #b66028;
}

.drop-zone strong,
.drop-zone span {
  display: block;
}

.drop-zone strong {
  font-size: 16px;
  font-weight: 950;
}

.drop-zone span {
  margin-top: 4px;
  color: #76512a;
  font-size: 12px;
  font-weight: 850;
  line-height: 1.45;
}

.hidden-input {
  display: none;
}

.upload-error {
  display: flex;
  gap: 6px;
  align-items: center;
  margin: 0;
  color: #a23e31;
  font-size: 12px;
  font-weight: 900;
}

@media (max-width: 760px) {
  .drop-zone {
    grid-template-columns: 1fr;
  }
}
</style>
