import { isNativeApp } from '@/native/native-platform'
import { recordNativePrefetchedChunk } from './use-native-mode-cache'
import { detectTabletPerformanceTier } from './use-tablet-performance'

type IdleDeadlineLike = {
  didTimeout: boolean
  timeRemaining: () => number
}

type IdleTask = {
  name: string
  load: () => Promise<unknown>
  reduced?: boolean
}

type RequestIdleCallback = (callback: (deadline: IdleDeadlineLike) => void, options?: { timeout?: number }) => number
type CancelIdleCallback = (handle: number) => void

const prefetched = new Set<string>()

function requestIdle(callback: (deadline: IdleDeadlineLike) => void, timeout: number) {
  const nativeRequestIdle = (window as Window & { requestIdleCallback?: RequestIdleCallback }).requestIdleCallback
  if (nativeRequestIdle) return nativeRequestIdle(callback, { timeout })
  return window.setTimeout(() => callback({ didTimeout: true, timeRemaining: () => 0 }), timeout)
}

function cancelIdle(handle: number) {
  const nativeCancelIdle = (window as Window & { cancelIdleCallback?: CancelIdleCallback }).cancelIdleCallback
  if (nativeCancelIdle) {
    nativeCancelIdle(handle)
    return
  }
  window.clearTimeout(handle)
}

export function useIdlePrefetch(tasks: IdleTask[]) {
  if (typeof window === 'undefined' || !isNativeApp()) return () => undefined

  const reduced = detectTabletPerformanceTier() === 'reduced'
  const queue = tasks.filter((task) => !prefetched.has(task.name) && (!reduced || task.reduced))
  let timer = 0
  let idleHandle = 0
  let stopped = false

  async function runNext() {
    if (stopped || document.visibilityState === 'hidden' || !navigator.onLine) return
    const task = queue.shift()
    if (!task) return
    if (prefetched.has(task.name)) {
      scheduleNext()
      return
    }
    try {
      await task.load()
      prefetched.add(task.name)
      recordNativePrefetchedChunk()
    } catch {
      // Prefetch is best-effort and must never block the current screen.
    }
    scheduleNext()
  }

  function scheduleNext() {
    if (stopped || !queue.length) return
    idleHandle = requestIdle(() => {
      void runNext()
    }, 1200)
  }

  timer = window.setTimeout(scheduleNext, 800)

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') scheduleNext()
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)

  return () => {
    stopped = true
    if (timer) window.clearTimeout(timer)
    if (idleHandle) cancelIdle(idleHandle)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}
