import { computed, onBeforeUnmount, onMounted, type ComputedRef } from 'vue'
import { isNativeApp } from '@/native/native-platform'
import type { NativeViewportSnapshot } from '@/native/native-viewport-guard'

function canExposeNativeViewport() {
  const apiEnv = String(import.meta.env.VITE_NATIVE_API_ENV ?? '')
  return import.meta.env.DEV || apiEnv === 'android-lan-debug'
}

function readSnapshot(): NativeViewportSnapshot {
  const visualViewportWidth = window.visualViewport?.width ?? window.innerWidth
  const visualViewportHeight = window.visualViewport?.height ?? window.innerHeight
  const visualViewportScale = window.visualViewport?.scale ?? 1
  return {
    width: Math.round(document.documentElement.clientWidth || window.innerWidth),
    height: Math.round(window.innerHeight),
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    visualViewportWidth,
    visualViewportHeight,
    visualViewportScale,
    visualViewportOffsetLeft: window.visualViewport?.offsetLeft ?? 0,
    visualViewportOffsetTop: window.visualViewport?.offsetTop ?? 0,
    devicePixelRatio: window.devicePixelRatio || 1,
    ignoredZoomResizeCount: 0,
    acceptedResizeCount: 0,
  }
}

export function useNativeViewport(_performanceTier: ComputedRef<unknown>) {
  const enabled = computed(() => typeof window !== 'undefined' && isNativeApp() && canExposeNativeViewport())
  let frame = 0

  function publish() {
    if (!enabled.value) return
    window.__HANGLIAN_NATIVE_VIEWPORT__ = readSnapshot()
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
