import { isNativeApp } from '@/native/native-platform'
import type { HubMode } from '@/types/production'

type NativePerfMetrics = {
  activeMode: HubMode
  modeCacheHits: number
  modeCacheMisses: number
  lastModeSwitchMs: number
  lastModeFirstPaintMs: number
  backgroundRefreshCount: number
  deduplicatedRequestCount: number
  prefetchedChunks: number
  blockedMultitouchCount: number
  ignoredZoomResizeCount: number
  bodyScrollTop: number
  bodyScrollHeight: number
  bodyClientHeight: number
  lastLongTaskMs: number
  longTaskCount: number
}

declare global {
  interface Window {
    __HANGLIAN_NATIVE_PERF__?: NativePerfMetrics
  }
}

const metrics: NativePerfMetrics = {
  activeMode: 'drawing',
  modeCacheHits: 0,
  modeCacheMisses: 0,
  lastModeSwitchMs: 0,
  lastModeFirstPaintMs: 0,
  backgroundRefreshCount: 0,
  deduplicatedRequestCount: 0,
  prefetchedChunks: 0,
  blockedMultitouchCount: 0,
  ignoredZoomResizeCount: 0,
  bodyScrollTop: 0,
  bodyScrollHeight: 0,
  bodyClientHeight: 0,
  lastLongTaskMs: 0,
  longTaskCount: 0,
}

let cleanupDiagnostics: (() => void) | null = null

function canExposeNativePerf() {
  if (typeof window === 'undefined') return false
  const apiEnv = String(import.meta.env.VITE_NATIVE_API_ENV ?? '')
  return isNativeApp() && (import.meta.env.DEV || apiEnv === 'android-lan-debug')
}

function refreshBodyMetrics() {
  if (typeof document === 'undefined') return
  metrics.bodyScrollTop = document.scrollingElement?.scrollTop ?? document.body?.scrollTop ?? 0
  metrics.bodyScrollHeight = document.body?.scrollHeight ?? 0
  metrics.bodyClientHeight = document.body?.clientHeight ?? 0
}

export function publishNativePerfMetrics() {
  if (!canExposeNativePerf()) return
  refreshBodyMetrics()
  window.__HANGLIAN_NATIVE_PERF__ = { ...metrics }
}

export function clearNativePerfMetrics() {
  if (typeof window !== 'undefined') delete window.__HANGLIAN_NATIVE_PERF__
}

export function setNativeActiveMode(mode: HubMode) {
  metrics.activeMode = mode
  publishNativePerfMetrics()
}

export function recordNativeModeCacheHit() {
  metrics.modeCacheHits += 1
  publishNativePerfMetrics()
}

export function recordNativeModeCacheMiss() {
  metrics.modeCacheMisses += 1
  publishNativePerfMetrics()
}

export function recordNativeBackgroundRefresh() {
  metrics.backgroundRefreshCount += 1
  publishNativePerfMetrics()
}

export function recordNativeDeduplicatedRequest() {
  metrics.deduplicatedRequestCount += 1
  publishNativePerfMetrics()
}

export function recordNativePrefetchedChunk() {
  metrics.prefetchedChunks += 1
  publishNativePerfMetrics()
}

export function recordNativeBlockedMultitouch() {
  metrics.blockedMultitouchCount += 1
  publishNativePerfMetrics()
}

export function recordNativeIgnoredZoomResize() {
  metrics.ignoredZoomResizeCount += 1
  publishNativePerfMetrics()
}

export function recordNativeModeSwitch(startedAt: number) {
  metrics.lastModeSwitchMs = Math.max(0, Math.round(performance.now() - startedAt))
  publishNativePerfMetrics()
}

export function recordNativeModeFirstPaint(startedAt: number) {
  metrics.lastModeFirstPaintMs = Math.max(0, Math.round(performance.now() - startedAt))
  publishNativePerfMetrics()
}

export function installNativePerfDiagnostics() {
  if (cleanupDiagnostics) return cleanupDiagnostics
  if (!canExposeNativePerf()) return null

  let longTaskObserver: PerformanceObserver | null = null
  let frame = 0

  function schedulePublish() {
    if (frame) return
    frame = window.requestAnimationFrame(() => {
      frame = 0
      publishNativePerfMetrics()
    })
  }

  try {
    longTaskObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const last = entries[entries.length - 1]
      if (last) {
        metrics.lastLongTaskMs = Math.round(last.duration)
        metrics.longTaskCount += entries.length
        publishNativePerfMetrics()
      }
    })
    longTaskObserver.observe({ entryTypes: ['longtask'] })
  } catch {
    longTaskObserver = null
  }

  window.addEventListener('scroll', schedulePublish, { passive: true })
  window.addEventListener('resize', schedulePublish, { passive: true })
  publishNativePerfMetrics()

  cleanupDiagnostics = () => {
    if (frame) window.cancelAnimationFrame(frame)
    frame = 0
    window.removeEventListener('scroll', schedulePublish)
    window.removeEventListener('resize', schedulePublish)
    longTaskObserver?.disconnect()
    longTaskObserver = null
    cleanupDiagnostics = null
    clearNativePerfMetrics()
  }

  return cleanupDiagnostics
}
