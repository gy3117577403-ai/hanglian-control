<script setup lang="ts">
import { Eye, FileText, Image, Trash2, UploadCloud } from 'lucide-vue-next'
import type { DrawingModule } from '@/types/production'

defineProps<{
  module: DrawingModule
  featured?: boolean
}>()

const emit = defineEmits<{
  open: [module: DrawingModule]
  upload: [module: DrawingModule]
  delete: [module: DrawingModule]
}>()

function statusText(module: DrawingModule) {
  if (module.status === 'uploaded') return '已上传'
  if (module.status === 'no_drawing') return '未发图'
  return '待上传'
}

function firstType(module: DrawingModule) {
  return module.items[0]?.fileType === 'pdf' ? FileText : Image
}
</script>

<template>
  <article class="module-card" :class="{ missing: !module.items.length, featured }">
    <div class="preview-tile" :class="{ empty: !module.items.length }">
      <component :is="firstType(module)" :size="32" />
      <b>{{ module.items[0]?.title || module.moduleName }}</b>
      <span>{{ module.items[0]?.fileType?.toUpperCase() || (module.moduleKey === 'original_drawing' ? '未发图' : '待上传') }}</span>
    </div>
    <div class="module-body">
      <div>
        <h3>{{ module.moduleName }}</h3>
        <p>
          <template v-if="module.moduleKey === 'original_drawing' && !module.items.length">
            后续可由企业微信微盘同步原图。
          </template>
          <template v-else>{{ module.remark }}</template>
        </p>
      </div>
      <div class="meta-row">
        <span :class="module.status">{{ statusText(module) }}</span>
        <span>共 {{ module.items.length }} 项</span>
        <span>{{ module.updatedAt.slice(0, 10) }}</span>
      </div>
      <div class="actions">
        <PrimeButton severity="secondary" outlined rounded :title="`上传${module.moduleName}`" @click="emit('upload', module)">
          <UploadCloud :size="16" />
        </PrimeButton>
        <PrimeButton rounded :title="`查看全部${module.moduleName}`" @click="emit('open', module)">
          <Eye :size="16" />
        </PrimeButton>
        <PrimeButton
          severity="danger"
          outlined
          rounded
          :disabled="!module.items.length"
          :title="module.items.length ? `删除${module.moduleName}首页资料` : '暂无可删除资料'"
          @click="emit('delete', module)"
        >
          <Trash2 :size="16" />
        </PrimeButton>
      </div>
    </div>
  </article>
</template>

<style scoped>
.module-card {
  position: relative;
  isolation: isolate;
  transform-style: preserve-3d;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 8px;
  contain: layout paint style;
  content-visibility: auto;
  contain-intrinsic-size: 420px 594px;
  overflow: hidden;
  aspect-ratio: 1 / 1.414;
  min-height: 420px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.92);
  border-radius: 24px;
  background:
    linear-gradient(122deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.09) 30%, transparent 58%),
    linear-gradient(304deg, rgba(91, 148, 140, 0.22), rgba(91, 148, 140, 0.045) 52%, transparent 68%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.16), rgba(255, 238, 214, 0.018)),
    rgba(255, 255, 255, 0.04);
  box-shadow:
    0 50px 94px rgba(77, 39, 13, 0.16),
    0 0 0 1px rgba(124, 75, 34, 0.055),
    0 0 88px rgba(255, 255, 255, 0.36),
    0 8px 22px rgba(255, 255, 255, 0.24) inset,
    0 2px 0 rgba(255, 255, 255, 0.98) inset,
    24px 0 52px rgba(255, 255, 255, 0.28) inset,
    -26px -18px 58px rgba(105, 151, 145, 0.12) inset,
    0 -26px 58px rgba(184, 94, 38, 0.018) inset;
  backdrop-filter: blur(18px) saturate(1.16);
  -webkit-backdrop-filter: blur(18px) saturate(1.16);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.module-card::before {
  position: absolute;
  inset: 1px;
  z-index: -1;
  border-radius: 23px;
  background:
    linear-gradient(122deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.12) 29%, transparent 55%),
    linear-gradient(305deg, rgba(205, 111, 45, 0.012), transparent 46%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.2), transparent 18%, transparent 82%, rgba(113, 66, 28, 0.08));
  content: '';
  pointer-events: none;
}

.module-card::after {
  position: absolute;
  right: 10px;
  bottom: 9px;
  left: 10px;
  z-index: -1;
  height: 32px;
  border-radius: 999px;
  background: rgba(72, 39, 18, 0.17);
  content: '';
  filter: blur(22px);
  transform: translateY(15px);
  pointer-events: none;
}

.module-card.missing {
  border-style: dashed;
}

.module-card:hover {
  border-color: rgba(255, 255, 255, 0.98);
  box-shadow:
    0 52px 96px rgba(77, 39, 13, 0.17),
    0 0 0 1px rgba(124, 75, 34, 0.055),
    0 0 70px rgba(255, 255, 255, 0.24),
    0 2px 0 rgba(255, 255, 255, 0.94) inset,
    16px 0 36px rgba(255, 255, 255, 0.24) inset,
    -12px -8px 38px rgba(105, 151, 145, 0.08) inset,
    0 -18px 42px rgba(184, 94, 38, 0.022) inset;
  transform: translateY(-2px) rotateX(0.35deg);
}

.preview-tile {
  position: relative;
  z-index: 1;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 5px;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  background:
    linear-gradient(128deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.09) 34%, transparent 64%),
    linear-gradient(304deg, rgba(98, 148, 141, 0.14), rgba(98, 148, 141, 0.03) 56%, transparent),
    rgba(255, 255, 255, 0.035);
  color: #3c2817;
  text-align: center;
  box-shadow:
    0 34px 64px rgba(88, 47, 18, 0.12),
    0 0 0 1px rgba(134, 78, 32, 0.04),
    0 10px 22px rgba(255, 255, 255, 0.2) inset,
    0 2px 0 rgba(255, 255, 255, 0.98) inset,
    24px 0 48px rgba(255, 255, 255, 0.28) inset,
    -22px -14px 48px rgba(99, 142, 136, 0.12) inset,
    inset 0 -34px 70px rgba(197, 104, 40, 0.012);
  backdrop-filter: blur(16px) saturate(1.14);
  -webkit-backdrop-filter: blur(16px) saturate(1.14);
}

.preview-tile::before {
  position: absolute;
  inset: 18px 22px 20px;
  z-index: 0;
  border: 1px solid rgba(255, 255, 255, 0.96);
  border-radius: 15px;
  background:
    linear-gradient(90deg, rgba(88, 115, 108, 0.05) 1px, transparent 1px) 0 0 / 34px 34px,
    linear-gradient(0deg, rgba(88, 115, 108, 0.04) 1px, transparent 1px) 0 0 / 34px 34px,
    linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0 8%, transparent 8%),
    linear-gradient(128deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.18) 52%, rgba(223, 238, 228, 0.12)),
    rgba(255, 255, 255, 0.18);
  box-shadow:
    0 30px 56px rgba(93, 48, 18, 0.1),
    0 0 0 9px rgba(255, 255, 255, 0.05),
    0 2px 0 rgba(255, 255, 255, 0.96) inset,
    inset 18px 0 38px rgba(255, 255, 255, 0.2),
    inset -16px -12px 34px rgba(105, 145, 138, 0.08),
    inset 0 -20px 42px rgba(151, 89, 42, 0.012);
  content: '';
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.preview-tile::after {
  position: absolute;
  inset: -50% auto auto -13%;
  z-index: 1;
  width: 66%;
  height: 170%;
  background:
    linear-gradient(102deg, rgba(255, 255, 255, 0.56), rgba(255, 255, 255, 0.08) 58%, transparent),
    linear-gradient(88deg, transparent, rgba(255, 255, 255, 0.2), transparent 74%);
  content: '';
  pointer-events: none;
  transform: rotate(12deg);
}

.preview-tile.empty {
  background:
    linear-gradient(122deg, rgba(255, 255, 255, 0.54), rgba(255, 255, 255, 0.08) 54%),
    rgba(255, 250, 241, 0.08);
}

.preview-tile b,
.preview-tile span {
  position: relative;
  z-index: 2;
  max-width: 76%;
  overflow: hidden;
  color: #3b2716;
  text-overflow: ellipsis;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.55);
  white-space: nowrap;
}

.preview-tile b {
  padding: 7px 12px 2px;
  border: 1px solid rgba(255, 255, 255, 0.54);
  border-radius: 999px;
  background:
    linear-gradient(128deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.13)),
    rgba(255, 255, 255, 0.12);
  font-size: 15px;
  line-height: 1.15;
  box-shadow:
    0 10px 18px rgba(79, 44, 20, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.preview-tile span {
  padding: 2px 10px 6px;
  color: #73512c;
  font-size: 12px;
  font-weight: 850;
}

.preview-tile :deep(svg) {
  position: relative;
  z-index: 2;
  display: grid;
  box-sizing: content-box;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 16px;
  background:
    linear-gradient(130deg, rgba(255, 255, 255, 0.66), rgba(255, 255, 255, 0.18)),
    rgba(255, 255, 255, 0.2);
  color: #b66028;
  box-shadow:
    0 14px 26px rgba(112, 58, 24, 0.13),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.module-body {
  position: static;
  z-index: auto;
  display: grid;
  grid-template-rows: auto auto;
  min-width: 0;
  padding: 2px 2px 0;
}

h3,
p {
  margin: 0;
}

h3 {
  color: #342112;
  font-size: 18px;
  font-weight: 950;
}

p {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 4px;
  color: #7b542c;
  font-size: 12px;
  font-weight: 850;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.meta-row,
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.meta-row span {
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  box-shadow:
    0 6px 12px rgba(86, 48, 22, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
  color: #724722;
  font-size: 11px;
  font-weight: 950;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.meta-row .uploaded {
  color: #3f7a36;
}

.meta-row .pending {
  color: #a34f1f;
}

.meta-row .no_drawing {
  color: #9b3d32;
}

.actions {
  position: absolute;
  top: 21px;
  right: 21px;
  z-index: 3;
  justify-content: flex-end;
  margin-top: 0;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.64);
  border-radius: 13px;
  background:
    linear-gradient(128deg, rgba(255, 255, 255, 0.66), rgba(255, 255, 255, 0.18)),
    rgba(255, 255, 255, 0.22);
  box-shadow:
    0 10px 18px rgba(80, 42, 16, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(14px) saturate(1.14);
  -webkit-backdrop-filter: blur(14px) saturate(1.14);
}

.actions :deep(.p-button) {
  width: 29px;
  height: 29px;
  min-height: 29px;
  padding: 0;
  border-radius: 10px;
  border-color: rgba(255, 255, 255, 0.76) !important;
  background:
    linear-gradient(130deg, rgba(255, 255, 255, 0.64), rgba(255, 255, 255, 0.18)),
    rgba(255, 255, 255, 0.34) !important;
  box-shadow: 0 8px 14px rgba(80, 42, 16, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.88);
  color: #8f4a22 !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.actions :deep(.p-button-danger) {
  color: #8d3b2f !important;
}

.actions :deep(.p-button:hover) {
  box-shadow: 0 10px 18px rgba(80, 42, 16, 0.13), inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
}

@media (max-width: 1320px) {
  .module-card {
    min-height: 360px;
    backdrop-filter: blur(14px) saturate(1.12);
    -webkit-backdrop-filter: blur(14px) saturate(1.12);
  }

  .preview-tile {
    backdrop-filter: blur(10px) saturate(1.08);
    -webkit-backdrop-filter: blur(10px) saturate(1.08);
  }

  h3 {
    font-size: 16px;
  }
}
</style>
