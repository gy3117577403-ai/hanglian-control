<script setup lang="ts">
import { Cable, FileStack, LibraryBig, Wrench } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { HubMode } from '@/types/production'

const props = defineProps<{
  activeMode: HubMode
}>()

const emit = defineEmits<{
  select: [mode: HubMode]
}>()

const expanded = ref(false)
const orbRef = ref<HTMLElement | null>(null)

const options = [
  { mode: 'drawing' as const, label: '图纸库', shortLabel: '图纸', icon: FileStack },
  { mode: 'connector' as const, label: '连接器参数', shortLabel: '连接器', icon: Cable },
  { mode: 'fixture' as const, label: '治具参数', shortLabel: '治具', icon: Wrench },
]

const activeLabel = computed(() => options.find((item) => item.mode === props.activeMode)?.shortLabel ?? '资料库')

function select(mode: HubMode) {
  emit('select', mode)
  expanded.value = false
}

function handleOutsidePointer(event: PointerEvent) {
  if (!expanded.value) return
  const target = event.target as Node | null
  if (target && orbRef.value?.contains(target)) return
  expanded.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointer)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointer)
})
</script>

<template>
  <div
    ref="orbRef"
    class="orb-wrap"
    :class="{ expanded }"
  >
    <button class="main-orb" type="button" aria-label="资料库功能入口" @click="expanded = !expanded">
      <LibraryBig :size="26" />
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
        <component :is="item.icon" :size="19" />
        <span>{{ item.shortLabel }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.orb-wrap {
  position: relative;
  width: 72px;
  min-height: 64px;
}

.main-orb,
.orb-menu button {
  min-width: 56px;
  min-height: 56px;
  border: 1px solid rgba(126, 74, 28, 0.2);
  color: #fff8e8;
  font-weight: 950;
  cursor: pointer;
}

.main-orb {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  padding: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 24%, #ffd58c, #df7f32 48%, #9f451e 100%);
  box-shadow: 0 14px 24px rgba(113, 55, 19, 0.24), inset 0 4px 8px rgba(255, 255, 255, 0.38);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.main-orb:hover,
.expanded .main-orb {
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 18px 28px rgba(113, 55, 19, 0.32), inset 0 4px 8px rgba(255, 255, 255, 0.42);
}

.main-orb span,
.main-orb small {
  line-height: 1;
}

.main-orb span {
  font-size: 13px;
}

.main-orb small {
  max-width: 48px;
  overflow: hidden;
  color: rgba(255, 248, 232, 0.88);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.orb-menu {
  position: absolute;
  top: 4px;
  left: 72px;
  z-index: 8;
  display: flex;
  gap: 7px;
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
  grid-template-rows: auto auto;
  gap: 2px;
  justify-items: center;
  align-items: center;
  width: 60px;
  padding: 0 12px;
  border-radius: 999px;
  background: linear-gradient(145deg, #f4b15a, #c76627);
  box-shadow: 0 10px 18px rgba(113, 55, 19, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.45);
  white-space: nowrap;
}

.orb-menu button span {
  font-size: 11px;
}

.orb-menu button.active {
  background: linear-gradient(145deg, #6f5029, #3f2a18);
  box-shadow: 0 12px 20px rgba(66, 38, 18, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.26);
}
</style>
