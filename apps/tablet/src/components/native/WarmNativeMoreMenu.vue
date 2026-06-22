<script setup lang="ts">
import { ArchiveRestore, ClipboardList, MoreHorizontal, ServerCog } from 'lucide-vue-next'
import { nextTick, onBeforeUnmount, ref } from 'vue'

const props = defineProps<{
  drawingTrashTotal: number
  drawingMode: boolean
}>()

const emit = defineEmits<{
  'open-network': []
  'open-trash': []
  'open-order-overview': []
}>()

const open = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const panelStyle = ref<Record<string, string>>({})

function updatePosition() {
  const rect = triggerRef.value?.getBoundingClientRect()
  if (!rect) return
  const width = 188
  const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width))
  panelStyle.value = {
    top: `${Math.round(rect.bottom + 8)}px`,
    left: `${Math.round(left)}px`,
    width: `${width}px`,
  }
}

async function toggle() {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    updatePosition()
  }
}

function close() {
  open.value = false
}

function handleOutside(event: PointerEvent) {
  if (!open.value) return
  const target = event.target as Node | null
  if (target && triggerRef.value?.contains(target)) return
  const panel = document.querySelector('[data-native-more-menu="true"]')
  if (target && panel?.contains(target)) return
  close()
}

function run(action: () => void) {
  close()
  action()
}

document.addEventListener('pointerdown', handleOutside, { capture: true })
window.addEventListener('resize', updatePosition, { passive: true })

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutside, { capture: true })
  window.removeEventListener('resize', updatePosition)
})
</script>

<template>
  <button
    ref="triggerRef"
    type="button"
    class="native-more-trigger"
    aria-label="更多"
    :aria-expanded="open"
    @click="toggle"
  >
    <MoreHorizontal :size="19" />
    <span>更多</span>
  </button>

  <Teleport to="body">
    <div
      v-if="open"
      class="native-more-menu-panel"
      data-native-more-menu="true"
      :style="panelStyle"
    >
      <button type="button" @click="run(() => emit('open-order-overview'))">
        <ClipboardList :size="17" />
        <span>订单总览</span>
      </button>
      <button v-if="props.drawingMode" type="button" @click="run(() => emit('open-trash'))">
        <ArchiveRestore :size="17" />
        <span>回收站</span>
        <small v-if="props.drawingTrashTotal > 0">{{ props.drawingTrashTotal }}</small>
      </button>
      <button type="button" @click="run(() => emit('open-network'))">
        <ServerCog :size="17" />
        <span>网络诊断</span>
      </button>
    </div>
  </Teleport>
</template>
