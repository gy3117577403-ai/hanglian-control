<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronLeft, UploadCloud } from 'lucide-vue-next'
import WarmDrawingModuleCard from './WarmDrawingModuleCard.vue'
import { createWarmAsyncComponent } from '@/lib/async-components'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { DrawingItem, DrawingModule } from '@/types/production'

const store = useDocumentHubStore()
const moveToTrashOpen = ref(false)
const moveToTrashItem = ref<DrawingItem | null>(null)
const moveToTrashModule = ref<DrawingModule | null>(null)
const WarmMoveToTrashDialog = createWarmAsyncComponent(() => import('@/components/trash/WarmMoveToTrashDialog.vue'), {
  name: 'WarmMoveToTrashDialog',
  label: '正在加载删除确认...',
})

const modules = computed(() => store.productDrawingDetail?.modules ?? [])
const primaryModules = computed(() => (
  ['original_drawing', 'sop']
    .map((key) => modules.value.find((module) => module.moduleKey === key))
    .filter(Boolean) as DrawingModule[]
))
const secondaryModules = computed(() => modules.value.filter((module) => !['original_drawing', 'sop'].includes(module.moduleKey)))

function statusText(status?: string) {
  if (status === 'available') return '已有图纸'
  if (status === 'partial') return '部分资料'
  return '未发图'
}

async function openMoveToTrash(module: DrawingModule, item?: DrawingItem | null) {
  const targetItem = item ?? module.items.find((entry) => !entry.deleted && !entry.deletedAt) ?? null
  if (!targetItem) return
  const ready = await store.prepareTrashDocument(targetItem, module)
  if (!ready) return
  moveToTrashItem.value = targetItem
  moveToTrashModule.value = module
  moveToTrashOpen.value = true
}

watch(moveToTrashOpen, (visible) => {
  if (visible) return
  moveToTrashItem.value = null
  moveToTrashModule.value = null
  store.closeMoveToTrashDialog()
})
</script>

<template>
  <div class="product-home" data-scroll-key="product">
    <template v-if="store.productDrawingDetail">
      <section class="product-hero">
        <PrimeButton severity="secondary" outlined rounded title="返回上级" @click="store.goBack()">
          <ChevronLeft :size="19" />
        </PrimeButton>
        <div class="hero-main">
          <p>{{ store.productDrawingDetail.customer?.customerName || '待补充客户资料' }}</p>
          <h2>{{ store.productDrawingDetail.product.productModel }}</h2>
          <span>{{ store.productDrawingDetail.product.productName }}</span>
        </div>
        <b :class="store.productDrawingDetail.product.drawingStatus">
          {{ statusText(store.productDrawingDetail.product.drawingStatus) }}
        </b>
        <PrimeButton class="hero-upload" rounded title="上传资料" aria-label="上传资料" @click="store.openTopUpload()">
          <UploadCloud :size="17" />
        </PrimeButton>
      </section>

      <section class="a4-grid primary-grid">
        <WarmDrawingModuleCard
          v-for="module in primaryModules"
          :key="module.moduleKey"
          featured
          :module="module"
          @open="store.openModule"
          @preview="store.openModuleViewer"
          @upload="store.openModuleUpload"
          @delete="openMoveToTrash"
        />
      </section>

      <section class="a4-grid secondary-grid">
        <WarmDrawingModuleCard
          v-for="module in secondaryModules"
          :key="module.moduleKey"
          :module="module"
          @open="store.openModule"
          @preview="store.openModuleViewer"
          @upload="store.openModuleUpload"
          @delete="openMoveToTrash"
        />
      </section>
    </template>

    <section v-else class="empty-product">
      <b>暂无产品资料</b>
      <span>请从左侧今日订单或本周订单点击产品型号。</span>
    </section>

    <WarmMoveToTrashDialog
      v-if="moveToTrashOpen"
      v-model:visible="moveToTrashOpen"
      :item="moveToTrashItem"
      :module="moveToTrashModule"
    />
  </div>
</template>

<style scoped>
.product-home {
  height: 100%;
  overflow: auto;
  padding-right: 4px;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  -webkit-overflow-scrolling: touch;
}

.product-home::-webkit-scrollbar {
  width: 7px;
}

.product-home::-webkit-scrollbar-track {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
}

.product-home::-webkit-scrollbar-thumb {
  border: 1px solid rgba(255, 255, 255, 0.62);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.52), rgba(255, 255, 255, 0.1)),
    rgba(123, 78, 38, 0.42);
}

.product-hero {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
  padding: 10px 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  background:
    linear-gradient(120deg, rgba(255, 255, 255, 0.76), rgba(255, 255, 255, 0.1) 34%, transparent 62%),
    linear-gradient(300deg, rgba(97, 145, 139, 0.22), rgba(97, 145, 139, 0.05) 52%, transparent 68%),
    rgba(255, 255, 255, 0.045);
  box-shadow:
    0 16px 32px rgba(80, 42, 16, 0.12),
    0 2px 0 rgba(255, 255, 255, 0.98) inset,
    16px 0 32px rgba(255, 255, 255, 0.22) inset,
    -14px -10px 30px rgba(94, 138, 132, 0.08) inset;
}

.product-hero::before {
  position: absolute;
  inset: 1px;
  z-index: -1;
  border-radius: 19px;
  background:
    linear-gradient(116deg, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.12) 34%, transparent 58%),
    linear-gradient(300deg, rgba(106, 148, 142, 0.17), transparent 46%);
  content: '';
  pointer-events: none;
}

.product-hero::after {
  position: absolute;
  inset: -90% auto auto 18%;
  width: 34%;
  height: 240%;
  background: linear-gradient(96deg, transparent, rgba(255, 255, 255, 0.26), transparent);
  content: '';
  pointer-events: none;
  transform: rotate(13deg);
}

.product-hero > * {
  position: relative;
  z-index: 1;
}

.hero-main {
  min-width: 0;
}

p,
h2,
span {
  margin: 0;
}

p {
  color: #9b5125;
  font-size: 12px;
  font-weight: 950;
}

h2 {
  overflow: hidden;
  margin-top: 2px;
  color: #342112;
  font-size: 23px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

span {
  display: block;
  overflow: hidden;
  margin-top: 2px;
  color: #73512c;
  font-size: 13px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-hero > b {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
  color: #7a421f;
  white-space: nowrap;
}

.hero-upload {
  width: 36px;
  height: 36px;
  min-height: 36px;
  padding: 0;
  border-color: rgba(255, 255, 255, 0.72);
  background:
    linear-gradient(122deg, rgba(255, 255, 255, 0.46), transparent 48%),
    linear-gradient(145deg, rgba(225, 125, 51, 0.56), rgba(181, 82, 31, 0.46)),
    rgba(255, 255, 255, 0.18);
  box-shadow: 0 12px 20px rgba(132, 63, 20, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.54);
}

b.available {
  color: #3e783a;
}

b.partial {
  color: #a34f1f;
}

b.no_drawing {
  color: #9b3d32;
}

.a4-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  align-items: start;
}

.primary-grid {
  margin-bottom: 10px;
}

.secondary-grid {
  padding-bottom: 14px;
}

.empty-product {
  display: grid;
  place-items: center;
  height: 100%;
  border: 1px dashed rgba(139, 90, 42, 0.18);
  border-radius: 22px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.42), rgba(255, 234, 202, 0.18)),
    rgba(255, 255, 255, 0.18);
  color: #745130;
  text-align: center;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.empty-product b {
  color: #3d2815;
  font-size: 24px;
}

@media (max-width: 1320px) {
  .a4-grid {
    gap: 8px;
  }

  h2 {
    font-size: 20px;
  }
}
</style>
