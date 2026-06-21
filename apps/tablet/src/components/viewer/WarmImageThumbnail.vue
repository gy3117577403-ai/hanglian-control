<script setup lang="ts">
import { computed, ref } from 'vue'
import { RotateCcw } from 'lucide-vue-next'
import { resolveDocumentPreviewUrl } from '@/lib/document-preview-url'
import type { DocumentViewerItem } from '@/types/document-viewer'

const props = defineProps<{
  item: DocumentViewerItem
  index: number
  displayIndex: number
  active: boolean
}>()

const emit = defineEmits<{
  select: [index: number]
}>()

const failed = ref(false)
const retrySeed = ref(0)
const source = computed(() => resolveDocumentPreviewUrl(props.item.previewUrl))

function retry() {
  failed.value = false
  retrySeed.value += 1
}
</script>

<template>
  <button
    type="button"
    class="image-thumbnail"
    :class="{ active }"
    :data-thumbnail-key="`image-${item.itemId}`"
    :aria-current="active ? 'true' : undefined"
    @click="emit('select', index)"
  >
    <span class="image-frame">
      <img
        v-if="source && !failed"
        :key="`${source}-${retrySeed}`"
        :src="source"
        :alt="item.title"
        loading="lazy"
        decoding="async"
        @error="failed = true"
      >
      <span v-else class="image-error">
        图片预览失败
        <span class="retry" @click.stop="retry">
          <RotateCcw :size="14" />
        </span>
      </span>
    </span>
    <b>第 {{ displayIndex + 1 }} 张</b>
    <small>{{ item.title }}</small>
  </button>
</template>

<style scoped>
.image-thumbnail {
  display: grid;
  gap: 6px;
  width: 116px;
  min-width: 116px;
  min-height: 154px;
  padding: 8px;
  border: 1px solid rgba(255, 223, 183, 0.24);
  border-radius: 14px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.035)),
    rgba(82, 58, 38, 0.42);
  color: #fff4df;
  cursor: pointer;
  text-align: center;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    0 12px 22px rgba(10, 7, 4, 0.18);
}

.image-thumbnail.active {
  border-color: rgba(255, 183, 86, 0.96);
  background:
    linear-gradient(145deg, rgba(255, 214, 151, 0.3), rgba(255, 255, 255, 0.08)),
    rgba(131, 82, 37, 0.62);
  box-shadow:
    0 0 0 2px rgba(255, 183, 86, 0.32),
    0 20px 32px rgba(22, 12, 5, 0.26),
    inset 0 1px 0 rgba(255, 255, 255, 0.26);
}

.image-frame {
  display: grid;
  place-items: center;
  overflow: hidden;
  width: 100%;
  height: 104px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
}

img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.image-error {
  display: grid;
  place-items: center;
  gap: 4px;
  padding: 8px;
  color: #ffd0c2;
  font-size: 11px;
  font-weight: 900;
  line-height: 1.25;
}

.retry {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
}

b,
small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

b {
  font-size: 12px;
  font-weight: 950;
}

small {
  color: #e4bd8e;
  font-size: 11px;
  font-weight: 850;
}
</style>
