import { isReducedTabletPerformance } from './use-tablet-performance'

export const STANDARD_PDF_COVER_CONCURRENCY = 2
export const REDUCED_PDF_COVER_CONCURRENCY = 1

type QueueEntry = {
  key: string
  run: () => Promise<void>
  promise: Promise<void>
  resolve: () => void
  reject: (error: unknown) => void
  cancelled: boolean
}

const pendingEntries: QueueEntry[] = []
const queuedEntries = new Map<string, QueueEntry>()
const runningKeys = new Set<string>()
let draining = false
let pagehideBound = false

export function pdfCoverConcurrency() {
  return isReducedTabletPerformance() ? REDUCED_PDF_COVER_CONCURRENCY : STANDARD_PDF_COVER_CONCURRENCY
}

function removeEntry(entry: QueueEntry) {
  const index = pendingEntries.indexOf(entry)
  if (index >= 0) pendingEntries.splice(index, 1)
  queuedEntries.delete(entry.key)
}

function scheduleDrain() {
  if (draining) return
  draining = true
  window.requestAnimationFrame(() => {
    draining = false
    drainQueue()
  })
}

function drainQueue() {
  while (runningKeys.size < pdfCoverConcurrency() && pendingEntries.length) {
    const entry = pendingEntries.shift()
    if (!entry) return
    queuedEntries.delete(entry.key)
    if (entry.cancelled) {
      entry.resolve()
      continue
    }

    runningKeys.add(entry.key)
    void entry.run()
      .then(entry.resolve, entry.reject)
      .finally(() => {
        runningKeys.delete(entry.key)
        scheduleDrain()
      })
  }
}

export function cancelAllPdfCoverTasks() {
  for (const entry of pendingEntries) {
    entry.cancelled = true
    entry.resolve()
  }
  pendingEntries.length = 0
  queuedEntries.clear()
}

export function enqueuePdfCoverTask(key: string, run: () => Promise<void>) {
  const existing = queuedEntries.get(key)
  if (existing) {
    return {
      promise: existing.promise,
      cancel: () => {
        existing.cancelled = true
        removeEntry(existing)
        existing.resolve()
      },
    }
  }

  let entry: QueueEntry
  const promise = new Promise<void>((resolve, reject) => {
    entry = {
      key,
      run,
      promise: Promise.resolve(),
      resolve,
      reject,
      cancelled: false,
    }
  })
  entry!.promise = promise

  pendingEntries.push(entry!)
  queuedEntries.set(key, entry!)
  scheduleDrain()

  return {
    promise,
    cancel: () => {
      entry!.cancelled = true
      removeEntry(entry!)
      entry!.resolve()
    },
  }
}

export function usePdfCoverQueue() {
  if (!pagehideBound && typeof window !== 'undefined') {
    window.addEventListener('pagehide', cancelAllPdfCoverTasks, { once: false })
    pagehideBound = true
  }

  return {
    enqueue: enqueuePdfCoverTask,
    cancelAll: cancelAllPdfCoverTasks,
    concurrency: pdfCoverConcurrency,
  }
}
