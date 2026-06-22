import { computed, onBeforeUnmount, onMounted, type ComputedRef, type Ref } from 'vue'
import { installNativeViewportGuard } from '@/native/native-viewport-guard'
import { isNativeApp } from '@/native/native-platform'
import type { HubMode } from '@/types/production'
import type { TabletPerformanceTier } from './use-tablet-performance'

type NativeLayoutSnapshot = {
  appHeight: number
  appWidth: number
  bodyClientHeight: number
  bodyScrollHeight: number
  bodyScrollTop: number
  appClientHeight: number
  connectorClientHeight: number
  connectorScrollHeight: number
  connectorScrollTop: number
  activeMode: HubMode
  orderSidebarMounted: boolean
  connectorVirtualized: boolean
  connectorItemCount: number
}

declare global {
  interface Window {
    __HANGLIAN_NATIVE_LAYOUT__?: NativeLayoutSnapshot
  }
}

function isNativeViewportEnabled() {
  if (typeof document === 'undefined') return false
  return isNativeApp() || document.documentElement.dataset.nativeApp === 'true'
}

function canExposeDebugObject() {
  const apiEnv = String(import.meta.env.VITE_NATIVE_API_ENV ?? '')
  return import.meta.env.DEV || apiEnv === 'android-lan-debug'
}

export function useNativeAppViewport(performanceTier: ComputedRef<TabletPerformanceTier>) {
  const enabled = computed(() => typeof window !== 'undefined' && isNativeViewportEnabled())
  let cleanup: (() => void) | null = null

  onMounted(() => {
    if (!enabled.value) return
    cleanup = installNativeViewportGuard({
      getPerformanceTier: () => performanceTier.value,
      exposeDebug: canExposeDebugObject,
    })
  })

  onBeforeUnmount(() => {
    cleanup?.()
    cleanup = null
  })
}

export function useNativeLayoutDiagnostics(options: {
  activeMode: Ref<HubMode> | ComputedRef<HubMode>
  orderSidebarMounted: ComputedRef<boolean>
  connectorItemCount: ComputedRef<number>
}) {
  let frame = 0

  function readLayoutSnapshot(): NativeLayoutSnapshot {
    const body = document.body
    const app = document.querySelector<HTMLElement>('#app')
    const connector = document.querySelector<HTMLElement>('[data-native-connector-list]')
    const virtualHost = document.querySelector<HTMLElement>('[data-connector-virtualized]')
    return {
      appHeight: Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--native-app-height')) || window.innerHeight),
      appWidth: Math.round(document.documentElement.clientWidth || window.innerWidth),
      bodyClientHeight: body.clientHeight,
      bodyScrollHeight: body.scrollHeight,
      bodyScrollTop: document.scrollingElement?.scrollTop ?? body.scrollTop,
      appClientHeight: app?.clientHeight ?? 0,
      connectorClientHeight: connector?.clientHeight ?? 0,
      connectorScrollHeight: connector?.scrollHeight ?? 0,
      connectorScrollTop: connector?.scrollTop ?? 0,
      activeMode: options.activeMode.value,
      orderSidebarMounted: options.orderSidebarMounted.value,
      connectorVirtualized: virtualHost?.dataset.connectorVirtualized === 'true',
      connectorItemCount: options.connectorItemCount.value,
    }
  }

  function publish() {
    if (!isNativeViewportEnabled() || !canExposeDebugObject()) return
    window.__HANGLIAN_NATIVE_LAYOUT__ = readLayoutSnapshot()
  }

  function schedulePublish() {
    if (frame) return
    frame = window.requestAnimationFrame(() => {
      frame = 0
      publish()
    })
  }

  onMounted(() => {
    if (!isNativeViewportEnabled() || !canExposeDebugObject()) return
    publish()
    window.addEventListener('resize', schedulePublish, { passive: true })
    window.addEventListener('orientationchange', schedulePublish, { passive: true })
    window.addEventListener('scroll', schedulePublish, { passive: true })
    window.addEventListener('hanglian:native-layout-refresh', schedulePublish)
  })

  onBeforeUnmount(() => {
    if (frame) window.cancelAnimationFrame(frame)
    frame = 0
    window.removeEventListener('resize', schedulePublish)
    window.removeEventListener('orientationchange', schedulePublish)
    window.removeEventListener('scroll', schedulePublish)
    window.removeEventListener('hanglian:native-layout-refresh', schedulePublish)
    delete window.__HANGLIAN_NATIVE_LAYOUT__
  })

  return {
    refreshNativeLayoutDiagnostics: schedulePublish,
  }
}
