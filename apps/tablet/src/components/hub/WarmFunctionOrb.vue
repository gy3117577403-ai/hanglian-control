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
let lastPointerActionAt = -1000

const options = [
  { mode: 'drawing' as const, label: '图纸库', shortLabel: '图纸', icon: FileStack },
  { mode: 'connector' as const, label: '连接器参数', shortLabel: '连接器', icon: Cable },
  { mode: 'fixture' as const, label: '治具参数', shortLabel: '治具', icon: Wrench },
]

const activeLabel = computed(() => options.find((item) => item.mode === props.activeMode)?.shortLabel ?? '资料库')

function recentlyHandledPointer() {
  return lastPointerActionAt > 0 && performance.now() - lastPointerActionAt < 350
}

function markPointerAction() {
  lastPointerActionAt = performance.now()
}

function toggleExpanded() {
  expanded.value = !expanded.value
}

function handleOrbPointerdown() {
  markPointerAction()
  toggleExpanded()
}

function handleOrbClick() {
  if (recentlyHandledPointer()) return
  toggleExpanded()
}

function select(mode: HubMode) {
  emit('select', mode)
  expanded.value = false
}

function handleOptionPointerdown(mode: HubMode) {
  markPointerAction()
  select(mode)
}

function handleOptionClick(mode: HubMode) {
  if (recentlyHandledPointer()) return
  select(mode)
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
    <button
      class="main-orb"
      type="button"
      aria-label="资料库功能入口"
      aria-controls="document-hub-mode-menu"
      :aria-expanded="expanded"
      @pointerdown.prevent.stop="handleOrbPointerdown"
      @click="handleOrbClick"
    >
      <LibraryBig :size="26" />
      <span>资料库</span>
      <small>{{ activeLabel }}</small>
    </button>
    <div
      id="document-hub-mode-menu"
      class="orb-menu"
      :aria-hidden="!expanded"
      :inert="!expanded"
    >
      <button
        v-for="item in options"
        :key="item.mode"
        type="button"
        :aria-label="item.label"
        :tabindex="expanded ? 0 : -1"
        :class="{ active: item.mode === activeMode }"
        @pointerdown.prevent.stop="handleOptionPointerdown(item.mode)"
        @click="handleOptionClick(item.mode)"
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
  z-index: 12;
  width: 50px;
  min-height: 50px;
  transition: width 0.08s ease;
}

.orb-wrap.expanded {
  z-index: 80;
  width: 316px;
}

.main-orb,
.orb-menu button {
  min-width: 42px;
  min-height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  color: #5b3219;
  font-weight: 950;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
}

.main-orb {
  position: relative;
  isolation: isolate;
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  padding: 0;
  overflow: hidden;
  border-radius: 999px;
  background:
    linear-gradient(122deg, rgba(255, 255, 255, 0.64), rgba(255, 255, 255, 0.07) 48%),
    linear-gradient(310deg, rgba(96, 142, 136, 0.12), transparent 56%),
    rgba(255, 255, 255, 0.09);
  box-shadow:
    0 18px 34px rgba(113, 55, 19, 0.13),
    0 8px 20px rgba(255, 255, 255, 0.34) inset,
    -8px -6px 20px rgba(91, 131, 125, 0.08) inset,
    inset 0 1px 0 rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(30px) saturate(1.32);
  -webkit-backdrop-filter: blur(30px) saturate(1.32);
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}

.main-orb::before {
  position: absolute;
  inset: 2px 3px auto 3px;
  height: 46%;
  border-radius: 999px 999px 18px 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), transparent),
    linear-gradient(92deg, rgba(255, 255, 255, 0.48), transparent 48%);
  content: '';
  pointer-events: none;
}

.main-orb::after {
  position: absolute;
  right: 7px;
  bottom: 7px;
  width: 8px;
  height: 8px;
  border: 1px solid rgba(255, 255, 255, 0.92);
  border-radius: 999px;
  background: rgba(210, 107, 45, 0.78);
  box-shadow: 0 0 12px rgba(210, 107, 45, 0.32);
  content: '';
  pointer-events: none;
}

.main-orb > * {
  position: relative;
  z-index: 1;
}

.main-orb:hover,
.expanded .main-orb {
  transform: translateY(-1px);
  box-shadow:
    0 20px 38px rgba(113, 55, 19, 0.24),
    0 8px 20px rgba(255, 255, 255, 0.36) inset,
    inset 0 1px 0 rgba(255, 255, 255, 0.96);
}

.main-orb svg {
  width: 25px;
  height: 25px;
  filter: drop-shadow(0 7px 10px rgba(83, 45, 19, 0.16));
}

.main-orb span,
.main-orb small {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.orb-menu {
  position: absolute;
  top: 4px;
  left: 58px;
  z-index: 90;
  display: flex;
  gap: 7px;
  pointer-events: none;
  opacity: 0;
  transform: translateX(-6px) scale(0.98);
  transition: opacity 0.08s ease, transform 0.08s ease;
}

.expanded .orb-menu {
  pointer-events: auto;
  opacity: 1;
  transform: translateX(0) scale(1);
}

.orb-menu button {
  display: grid;
  grid-template-columns: auto auto;
  gap: 6px;
  justify-items: center;
  align-items: center;
  width: auto;
  min-width: 72px;
  padding: 0 10px;
  border-color: rgba(255, 255, 255, 0.78);
  border-radius: 16px;
  background:
    linear-gradient(122deg, rgba(255, 255, 255, 0.64), rgba(255, 255, 255, 0.08) 52%),
    linear-gradient(300deg, rgba(92, 142, 136, 0.1), transparent 58%),
    rgba(255, 255, 255, 0.1);
  box-shadow:
    0 10px 20px rgba(113, 55, 19, 0.12),
    0 1px 0 rgba(255, 255, 255, 0.94) inset,
    0 7px 14px rgba(255, 255, 255, 0.18) inset,
    0 -10px 20px rgba(124, 65, 28, 0.045) inset;
  white-space: nowrap;
  backdrop-filter: blur(18px) saturate(1.16);
  -webkit-backdrop-filter: blur(18px) saturate(1.16);
}

@media (max-width: 1320px) {
  .orb-wrap.expanded {
    width: 292px;
  }

  .orb-menu button {
    min-width: 66px;
    padding: 0 8px;
  }
}

.orb-menu button span {
  font-size: 11px;
}

.orb-menu button.active {
  border-color: rgba(255, 255, 255, 0.58);
  background:
    linear-gradient(122deg, rgba(255, 255, 255, 0.34), transparent 48%),
    linear-gradient(145deg, rgba(224, 138, 60, 0.56), rgba(181, 82, 31, 0.46)),
    rgba(255, 255, 255, 0.18);
  color: #fff8ed;
  box-shadow:
    0 14px 24px rgba(113, 55, 19, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.52);
}
</style>
