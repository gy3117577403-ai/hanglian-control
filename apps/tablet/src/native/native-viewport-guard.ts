import { recordNativeIgnoredZoomResize } from '@/composables/use-native-mode-cache'

export type NativeViewportSnapshot = {
  width: number
  height: number
  innerWidth: number
  innerHeight: number
  visualViewportWidth: number
  visualViewportHeight: number
  visualViewportScale: number
  visualViewportOffsetLeft: number
  visualViewportOffsetTop: number
  devicePixelRatio: number
  ignoredZoomResizeCount: number
  acceptedResizeCount: number
}

type NativeViewportGuardOptions = {
  getPerformanceTier?: () => string
  exposeDebug?: () => boolean
}

declare global {
  interface Window {
    __HANGLIAN_NATIVE_VIEWPORT__?: NativeViewportSnapshot
  }
}

let ignoredZoomResizeCount = 0
let acceptedResizeCount = 0
let lastStableWidth = 0
let lastStableHeight = 0
let cleanupViewportGuard: (() => void) | null = null

function validSize(value: number) {
  return Number.isFinite(value) && value >= 200
}

function layoutWidth() {
  return document.documentElement.clientWidth || window.innerWidth
}

function layoutHeight() {
  return window.innerHeight || document.documentElement.clientHeight
}

function viewportScale() {
  return window.visualViewport?.scale ?? 1
}

function viewportOffsetLeft() {
  return window.visualViewport?.offsetLeft ?? 0
}

function viewportOffsetTop() {
  return window.visualViewport?.offsetTop ?? 0
}

function isZoomedOrShifted() {
  return Math.abs(viewportScale() - 1) > 0.02
    || Math.abs(viewportOffsetLeft()) > 1
    || Math.abs(viewportOffsetTop()) > 1
}

function stableHeight(width: number) {
  const visual = window.visualViewport
  const visualHeight = visual?.height ?? 0
  const visualWidth = visual?.width ?? 0
  const baseHeight = layoutHeight()
  const keyboardLike = Boolean(
    visual
      && Math.abs(viewportScale() - 1) <= 0.02
      && Math.abs(visualWidth - width) <= 4
      && visualHeight > 200
      && visualHeight < baseHeight,
  )

  return Math.round(keyboardLike ? visualHeight : baseHeight)
}

function readStableSnapshot(): NativeViewportSnapshot | null {
  const width = Math.round(layoutWidth())
  const height = stableHeight(width)
  if (!validSize(width) || !validSize(height) || isZoomedOrShifted()) {
    ignoredZoomResizeCount += 1
    recordNativeIgnoredZoomResize()
    return null
  }

  lastStableWidth = width
  lastStableHeight = height
  acceptedResizeCount += 1

  return {
    width,
    height,
    innerWidth: Math.round(window.innerWidth),
    innerHeight: Math.round(window.innerHeight),
    visualViewportWidth: Math.round(window.visualViewport?.width ?? window.innerWidth),
    visualViewportHeight: Math.round(window.visualViewport?.height ?? window.innerHeight),
    visualViewportScale: viewportScale(),
    visualViewportOffsetLeft: viewportOffsetLeft(),
    visualViewportOffsetTop: viewportOffsetTop(),
    devicePixelRatio: window.devicePixelRatio || 1,
    ignoredZoomResizeCount,
    acceptedResizeCount,
  }
}

function writeViewportVariables(snapshot: NativeViewportSnapshot) {
  const root = document.documentElement
  root.style.setProperty('--native-app-height', `${snapshot.height}px`)
  root.style.removeProperty('--native-app-width')
}

function fallbackSnapshot(): NativeViewportSnapshot {
  const width = lastStableWidth || Math.round(layoutWidth())
  const height = lastStableHeight || Math.round(layoutHeight())
  return {
    width,
    height,
    innerWidth: Math.round(window.innerWidth),
    innerHeight: Math.round(window.innerHeight),
    visualViewportWidth: Math.round(window.visualViewport?.width ?? window.innerWidth),
    visualViewportHeight: Math.round(window.visualViewport?.height ?? window.innerHeight),
    visualViewportScale: viewportScale(),
    visualViewportOffsetLeft: viewportOffsetLeft(),
    visualViewportOffsetTop: viewportOffsetTop(),
    devicePixelRatio: window.devicePixelRatio || 1,
    ignoredZoomResizeCount,
    acceptedResizeCount,
  }
}

export function installNativeViewportGuard(options: NativeViewportGuardOptions = {}) {
  if (cleanupViewportGuard) return cleanupViewportGuard

  let frame = 0
  let orientationTimer: ReturnType<typeof setTimeout> | null = null

  function publish(snapshot: NativeViewportSnapshot) {
    writeViewportVariables(snapshot)
    if (options.getPerformanceTier) {
      document.documentElement.dataset.performanceTier = options.getPerformanceTier()
    }
    if (options.exposeDebug?.()) {
      window.__HANGLIAN_NATIVE_VIEWPORT__ = snapshot
    }
  }

  function update() {
    const snapshot = readStableSnapshot()
    if (snapshot) publish(snapshot)
  }

  function scheduleUpdate() {
    if (frame) return
    frame = window.requestAnimationFrame(() => {
      frame = 0
      update()
    })
  }

  function handleOrientationChange() {
    if (orientationTimer) clearTimeout(orientationTimer)
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        orientationTimer = setTimeout(update, 100)
      })
    })
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') scheduleUpdate()
  }

  const initialSnapshot = readStableSnapshot() ?? fallbackSnapshot()
  publish(initialSnapshot)

  window.addEventListener('resize', scheduleUpdate, { passive: true })
  window.addEventListener('orientationchange', handleOrientationChange, { passive: true })
  window.visualViewport?.addEventListener('resize', scheduleUpdate, { passive: true })
  document.addEventListener('visibilitychange', handleVisibilityChange)

  cleanupViewportGuard = () => {
    if (frame) window.cancelAnimationFrame(frame)
    if (orientationTimer) clearTimeout(orientationTimer)
    frame = 0
    orientationTimer = null
    window.removeEventListener('resize', scheduleUpdate)
    window.removeEventListener('orientationchange', handleOrientationChange)
    window.visualViewport?.removeEventListener('resize', scheduleUpdate)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    delete window.__HANGLIAN_NATIVE_VIEWPORT__
    cleanupViewportGuard = null
  }

  return cleanupViewportGuard
}
