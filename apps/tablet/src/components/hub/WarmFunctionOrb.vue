<script setup lang="ts">
import { Cable, FileStack, LibraryBig, Wrench } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import type { HubMode } from '@/types/production'

const props = defineProps<{
  activeMode: HubMode
}>()

const emit = defineEmits<{
  select: [mode: HubMode]
}>()

const expanded = ref(false)
const options = [
  { mode: 'drawing' as const, label: '图纸库', icon: FileStack },
  { mode: 'connector' as const, label: '连接器参数', icon: Cable },
  { mode: 'fixture' as const, label: '治具参数', icon: Wrench },
]

const activeLabel = computed(() => options.find((item) => item.mode === props.activeMode)?.label ?? '资料库')

function select(mode: HubMode) {
  emit('select', mode)
  expanded.value = false
}
</script>

<template>
  <div class="orb-wrap" :class="{ expanded }">
    <button class="main-orb" type="button" @click="expanded = !expanded">
      <LibraryBig :size="30" />
      <span>资料库</span>
      <small>{{ activeLabel }}</small>
    </button>
    <div class="orb-menu">
      <button
        v-for="item in options"
        :key="item.mode"
        type="button"
        :class="{ active: item.mode === activeMode }"
        @click="select(item.mode)"
      >
        <component :is="item.icon" :size="20" />
        <span>{{ item.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.orb-wrap {
  position: relative;
  width: 108px;
  height: 86px;
}

.main-orb,
.orb-menu button {
  border: 1px solid rgba(126, 74, 28, 0.2);
  color: #fff8e8;
  font-weight: 950;
  cursor: pointer;
}

.main-orb {
  display: grid;
  place-items: center;
  width: 86px;
  height: 86px;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 24%, #ffd58c, #dd7b31 46%, #9f451e 100%);
  box-shadow: 0 16px 28px rgba(113, 55, 19, 0.26), inset 0 4px 8px rgba(255, 255, 255, 0.38);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.main-orb:hover,
.expanded .main-orb {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 20px 34px rgba(113, 55, 19, 0.34), inset 0 4px 8px rgba(255, 255, 255, 0.42);
}

.main-orb span,
.main-orb small {
  line-height: 1;
}

.main-orb small {
  max-width: 70px;
  overflow: hidden;
  color: rgba(255, 248, 232, 0.88);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.orb-menu {
  position: absolute;
  top: 10px;
  left: 96px;
  z-index: 5;
  display: flex;
  gap: 8px;
  pointer-events: none;
  opacity: 0;
  transform: translateX(-12px) scale(0.96);
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.expanded .orb-menu {
  pointer-events: auto;
  opacity: 1;
  transform: translateX(0) scale(1);
}

.orb-menu button {
  display: grid;
  grid-template-columns: auto max-content;
  gap: 6px;
  align-items: center;
  min-height: 48px;
  padding: 0 13px;
  border-radius: 999px;
  background: linear-gradient(145deg, #f5b65e, #c76627);
  box-shadow: 0 12px 20px rgba(113, 55, 19, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.45);
  white-space: nowrap;
}

.orb-menu button.active {
  background: linear-gradient(145deg, #785a2d, #3f2a18);
}
</style>
