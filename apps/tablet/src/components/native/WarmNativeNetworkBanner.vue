<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Wifi, WifiOff } from 'lucide-vue-next'
import { getApiRuntimeConfig } from '@/config/api-base'
import { nativeNetworkState } from '@/native/native-network'
import { NATIVE_API_MISSING_MESSAGE, isNativeApp } from '@/native/native-platform'

const transientMessage = ref('')
let transientTimer: number | undefined

const nativeMissingApi = computed(() => {
  const config = getApiRuntimeConfig()
  return isNativeApp() && config.source === 'native-missing'
})

const message = computed(() => {
  if (nativeMissingApi.value) return NATIVE_API_MISSING_MESSAGE
  return transientMessage.value || nativeNetworkState.message
})

const visible = computed(() => Boolean(message.value))
const tone = computed(() => {
  if (nativeMissingApi.value || !nativeNetworkState.connected) return 'offline'
  return 'restored'
})
const Icon = computed(() => (tone.value === 'offline' ? WifiOff : Wifi))

function handleNativeMessage(event: Event) {
  const detail = (event as CustomEvent<{ message?: string }>).detail
  transientMessage.value = detail?.message?.trim() ?? ''
  if (transientTimer) window.clearTimeout(transientTimer)
  transientTimer = window.setTimeout(() => {
    transientMessage.value = ''
  }, 2200)
}

onMounted(() => {
  window.addEventListener('hanglian:native-message', handleNativeMessage)
})

onUnmounted(() => {
  window.removeEventListener('hanglian:native-message', handleNativeMessage)
  if (transientTimer) window.clearTimeout(transientTimer)
})
</script>

<template>
  <div v-if="visible" class="native-network-banner" :class="tone" role="status" aria-live="polite">
    <component :is="Icon" :size="16" />
    <span>{{ message }}</span>
  </div>
</template>

<style scoped>
.native-network-banner {
  position: fixed;
  z-index: 3200;
  top: max(10px, env(safe-area-inset-top));
  left: max(14px, env(safe-area-inset-left));
  right: max(14px, env(safe-area-inset-right));
  display: flex;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 999px;
  padding: 7px 14px;
  color: #342316;
  font-size: 14px;
  font-weight: 800;
  pointer-events: none;
  box-shadow: 0 10px 24px rgba(81, 42, 16, 0.14);
}

.native-network-banner.offline {
  background: rgba(255, 241, 222, 0.96);
  color: #7a2f16;
}

.native-network-banner.restored {
  background: rgba(234, 250, 241, 0.96);
  color: #1f6045;
}
</style>
