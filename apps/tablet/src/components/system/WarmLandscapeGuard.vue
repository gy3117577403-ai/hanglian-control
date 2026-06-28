<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RotateCcwSquare } from 'lucide-vue-next'

const storageKey = 'hanglian.landscapeGuardDismissed'
const visible = ref(false)

function isDismissed() {
  return typeof localStorage !== 'undefined' && localStorage.getItem(storageKey) === 'true'
}

function checkOrientation() {
  if (typeof window === 'undefined') return
  visible.value = window.innerWidth < window.innerHeight && !isDismissed()
}

function continueBrowsing() {
  if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, 'true')
  visible.value = false
}

onMounted(() => {
  checkOrientation()
  window.addEventListener('resize', checkOrientation)
  window.addEventListener('orientationchange', checkOrientation)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkOrientation)
  window.removeEventListener('orientationchange', checkOrientation)
})
</script>

<template>
  <aside v-if="visible" class="landscape-guard">
    <RotateCcwSquare :size="28" />
    <div>
      <strong>建议横屏使用</strong>
      <p>建议横屏使用，以获得完整的车间资料管控视图。</p>
    </div>
    <PrimeButton severity="secondary" label="继续浏览" @click="continueBrowsing" />
  </aside>
</template>
