import { computed, onBeforeUnmount, onMounted, type ComputedRef, type Ref } from 'vue'
import { isNativeApp } from '@/native/native-platform'
import type { HubMode } from '@/types/production'
import type { TabletPerformanceTier } from './use-tablet-performance'

type NativeViewportSnapshot = {
  width: number
  height: number
  innerWidth: number
  innerHeight: number
  visualViewportWidth: number
  visualViewportHeight: number
  devicePixelRatio: number
}

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
    __HANGLIAN_NATIVE_VIEWPORT__?: NativeViewportSnapshot
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

function validSize(value: number) {
  return Number.isFinite(value) && value >= 200
}

function readViewportSize() {
  const visualWidth = window.visualViewport?.width ?? window.innerWidth
  const visualHeight = window.visualViewport?.height ?? window.innerHeight
  const width = validSize(visualWidth) ? visualWidth : window.innerWidth
  const height = validSize(visualHeight) ? visualHeight : window.innerHeight
  return {
    width: Math.round(width),
    height: Math.round(height),
    innerWidth: Math.round(window.innerWidth),
    innerHeight: Math.round(window.innerHeight),
    visualViewportWidth: Math.round(visualWidth),
    visualViewportHeight: Math.round(visualHeight),
    devicePixelRatio: window.devicePixelRatio || 1,
  }
}

function writeViewportVariables(snapshot: NativeViewportSnapshot) {
  if (!validSize(snapshot.width) || !validSize(snapshot.height)) return
  const root = document.documentElement
  root.style.setProperty('--native-app-width', `${snapshot.width}px`)
  root.style.setProperty('--native-app-height', `${snapshot.height}px`)
}

export function useNativeAppViewport(performanceTier: ComputedRef<TabletPerformanceTier>) {
  const enabled = computed(() => typeof window !== 'undefined' && isNativeViewportEnabled())
  let frame = 0

  function publish() {
    if (!enabled.value) return
    const snapshot = readViewportSize()
    writeViewportVariables(snapshot)
    if (canExposeDebugObject()) {
      window.__HANGLIAN_NATIVE_VIEWPORT__ = snapshot
      window.__HANGLIAN_NATIVE_VIEWPORT__.devicePixelRatio = snapshot.devicePixelRatio
    }
    document.documentElement.dataset.performanceTier = performanceTier.value
  }

  function schedulePublish() {
    if (!enabled.value || frame) return
    frame = window.requestAnimationFrame(() => {
      frame = 0
      publish()
    })
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') schedulePublish()
  }

  onMounted(() => {
    if (!enabled.value) return
    publish()
    window.addEventListener('resize', schedulePublish, { passive: true })
    window.addEventListener('orientationchange', schedulePublish, { passive: true })
    window.visualViewport?.addEventListener('resize', schedulePublish, { passive: true })
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onBeforeUnmount(() => {
    if (frame) window.cancelAnimationFrame(frame)
    frame = 0
    window.removeEventListener('resize', schedulePublish)
    window.removeEventListener('orientationchange', schedulePublish)
    window.visualViewport?.removeEventListener('resize', schedulePublish)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    delete window.__HANGLIAN_NATIVE_VIEWPORT__
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
      appWidth: Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--native-app-width')) || window.innerWidth),
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
