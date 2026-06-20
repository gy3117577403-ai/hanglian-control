<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FileText, RotateCcw } from 'lucide-vue-next'
import WarmPdfFirstPagePreview from './WarmPdfFirstPagePreview.vue'
import { resolveDocumentPreviewUrl } from '@/lib/document-preview-url'
import type { DrawingItem, DrawingModuleKey } from '@/types/production'

const props = withDefaults(defineProps<{
  item?: DrawingItem | null
  moduleKey: DrawingModuleKey
  moduleName: string
  itemCount: number
  imageCount?: number
  fixedHeight?: number
}>(), {
  item: null,
  imageCount: 0,
  fixedHeight: 220,
})

const emit = defineEmits<{
  open: []
  retry: []
}>()

const imageLoaded = ref(false)
const imageFailed = ref(false)
const imageRetryKey = ref(0)

const kind = computed(() => props.item?.contentKind ?? props.item?.fileType)
const previewSource = computed(() => resolveDocumentPreviewUrl(props.item?.previewUrl))
const coverStyle = computed(() => ({ '--module-cover-height': `${props.fixedHeight}px` }))
const emptyText = computed(() => props.moduleKey === 'original_drawing' ? '暂无原图' : '暂无资料')
const isImage = computed(() => kind.value === 'image')
const isPdf = computed(() => kind.value === 'pdf')
const isText = computed(() => kind.value === 'text' || kind.value === 'card')
const textSummary = computed(() => (
  props.item?.remark
  ?? props.item?.description
  ?? props.item?.fileName
  ?? '暂无摘要'
))
const itemCountLabel = computed(() => {
  if (!props.itemCount) return ''
  if (isImage.value && props.imageCount === props.itemCount) {
    return props.imageCount === 1 ? '1 张' : `共 ${props.imageCount} 张`
  }
  return props.itemCount === 1 ? '1 项' : `共 ${props.itemCount} 项`
})

function retryImage() {
  imageRetryKey.value += 1
  imageLoaded.value = false
  imageFailed.value = false
  emit('retry')
}

watch(previewSource, () => {
  imageLoaded.value = false
  imageFailed.value = false
})
</script>

<template>
  <div
    :role="item ? 'button' : undefined"
    :tabindex="item ? 0 : -1"
    class="module-cover"
    :class="{ empty: !item, text: isText }"
    :style="coverStyle"
    @click="item && emit('open')"
    @keydown.enter="item && emit('open')"
    @keydown.space.prevent="item && emit('open')"
  >
    <template v-if="!item">
      <span class="empty-state">
        <FileText :size="32" />
        <b>{{ emptyText }}</b>
      </span>
    </template>

    <WarmPdfFirstPagePreview
      v-else-if="isPdf"
      :source="previewSource"
      :title="item.title"
      :fixed-height="fixedHeight"
      @open="emit('open')"
      @retry="emit('retry')"
    />

    <template v-else-if="isImage">
      <PrimeSkeleton v-if="!imageLoaded && !imageFailed" class="image-skeleton" height="100%" />
      <img
        v-if="previewSource && !imageFailed"
        :key="`${previewSource}-${imageRetryKey}`"
        class="cover-image"
        :class="{ loaded: imageLoaded }"
        :src="previewSource"
        :alt="item.title"
        loading="lazy"
        @load="imageLoaded = true"
        @error="imageFailed = true"
      >
      <span v-if="imageFailed || !previewSource" class="failed-state">
        <b>图片预览失败</b>
        <PrimeButton severity="secondary" size="small" text rounded title="重试图片预览" @click.stop="retryImage">
          <RotateCcw :size="14" />
          <span>重试</span>
        </PrimeButton>
      </span>
    </template>

    <span v-else class="text-cover">
      <b>{{ item.title }}</b>
      <small>{{ textSummary }}</small>
    </span>

    <span v-if="itemCountLabel" class="count-badge">{{ itemCountLabel }}</span>
  </div>
</template>

<style scoped>
.module-cover {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: var(--module-cover-height);
  min-height: var(--module-cover-height);
  overflow: hidden;
  padding: 0;
  border: 0;
  border-radius: 18px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.8), rgba(255, 245, 228, 0.46)),
    rgba(255, 255, 255, 0.18);
  color: #3c2817;
  cursor: pointer;
}

.module-cover.empty,
.module-cover.text {
  padding: 16px;
}

.image-skeleton {
  position: absolute;
  inset: 0;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  transition: opacity 0.18s ease;
}

.cover-image.loaded {
  opacity: 1;
}

.empty-state,
.failed-state,
.text-cover {
  position: relative;
  z-index: 2;
  display: grid;
  gap: 8px;
  justify-items: center;
  text-align: center;
}

.empty-state {
  color: #8a6238;
  font-size: 13px;
  font-weight: 950;
}

.failed-state {
  color: #9b3d32;
  font-size: 12px;
  font-weight: 950;
}

.text-cover {
  align-content: center;
  width: 100%;
  height: 100%;
}

.text-cover b,
.text-cover small {
  display: -webkit-box;
  overflow: hidden;
  max-width: 100%;
  -webkit-box-orient: vertical;
}

.text-cover b {
  color: #342112;
  font-size: 17px;
  font-weight: 950;
  -webkit-line-clamp: 2;
}

.text-cover small {
  color: #75512b;
  font-size: 13px;
  font-weight: 850;
  line-height: 1.55;
  -webkit-line-clamp: 4;
}

.count-badge {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 3;
  padding: 4px 8px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: #70421d;
  font-size: 11px;
  font-weight: 950;
  box-shadow: 0 8px 16px rgba(80, 42, 16, 0.11);
}
</style>
