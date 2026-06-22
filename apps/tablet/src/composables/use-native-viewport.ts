import { computed, onBeforeUnmount, onMounted, type ComputedRef } from 'vue'
import { isNativeApp } from '@/native/native-platform'
import type { TabletPerformanceTier } from './use-tablet-performance'

type NativeViewportSnapshot = {
  innerWidth: number
  innerHeight: number
  visualViewportWidth: number
  visualViewportHeight: number
  devicePixelRatio: number
  screenWidth: number
  screenHeight: number
  performanceTier: TabletPerformanceTier
  nativeApp: boolean
}

declare global {
  interface Window {
    __HANGLIAN_NATIVE_VIEWPORT__?: NativeViewportSnapshot
  }
}

function canExposeNativeViewport() {
  const apiEnv = String(import.meta.env.VITE_NATIVE_API_ENV ?? '')
  return import.meta.env.DEV || apiEnv === 'android-lan-debug'
}

function readSnapshot(performanceTier: TabletPerformanceTier): NativeViewportSnapshot {
  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    visualViewportWidth: window.visualViewport?.width ?? window.innerWidth,
    visualViewportHeight: window.visualViewport?.height ?? window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
    screenWidth: window.screen?.width ?? 0,
    screenHeight: window.screen?.height ?? 0,
    performanceTier,
    nativeApp: isNativeApp(),
  }
}

export function useNativeViewport(performanceTier: ComputedRef<TabletPerformanceTier>) {
  const enabled = computed(() => typeof window !== 'undefined' && isNativeApp() && canExposeNativeViewport())
  let frame = 0

  function publish() {
    if (!enabled.value) return
    window.__HANGLIAN_NATIVE_VIEWPORT__ = readSnapshot(performanceTier.value)
  }

  function schedulePublish() {
    if (!enabled.value || frame) return
    frame = window.requestAnimationFrame(() => {
      frame = 0
      publish()
    })
  }

  onMounted(() => {
    if (!enabled.value) return
    publish()
    window.addEventListener('resize', schedulePublish, { passive: true })
    window.visualViewport?.addEventListener('resize', schedulePublish, { passive: true })
    window.visualViewport?.addEventListener('scroll', schedulePublish, { passive: true })
  })

  onBeforeUnmount(() => {
    if (frame) window.cancelAnimationFrame(frame)
    frame = 0
    window.removeEventListener('resize', schedulePublish)
    window.visualViewport?.removeEventListener('resize', schedulePublish)
    window.visualViewport?.removeEventListener('scroll', schedulePublish)
    if (typeof window !== 'undefined') delete window.__HANGLIAN_NATIVE_VIEWPORT__
  })
}
