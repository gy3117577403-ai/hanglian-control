import { onBeforeUnmount } from 'vue'

type ThumbnailJob = {
  pageNumber: number
  controller: AbortController
  run: (signal: AbortSignal) => Promise<void>
}

export interface PdfThumbnailQueue {
  readonly maxConcurrent: number
  enqueue: (pageNumber: number, run: (signal: AbortSignal) => Promise<void>) => Promise<void>
  cancel: (pageNumber: number) => void
  cancelAll: () => void
  reset: () => void
  hasRenderedPage: (pageNumber: number) => boolean
  markRendered: (pageNumber: number) => void
}

export function usePdfThumbnailQueue(maxConcurrent = 2): PdfThumbnailQueue {
  const pending: ThumbnailJob[] = []
  const active = new Map<number, ThumbnailJob>()
  const queuedPageNumbers = new Set<number>()
  const renderedPages = new Set<number>()

  function pump() {
    while (active.size < maxConcurrent && pending.length) {
      const job = pending.shift()
      if (!job || job.controller.signal.aborted) continue
      queuedPageNumbers.delete(job.pageNumber)
      active.set(job.pageNumber, job)
      void job.run(job.controller.signal)
        .then(() => {
          if (!job.controller.signal.aborted) renderedPages.add(job.pageNumber)
        })
        .catch(() => {
          // Each thumbnail owns its visible failure state; the queue only keeps moving.
        })
        .finally(() => {
          active.delete(job.pageNumber)
          pump()
        })
    }
  }

  function enqueue(pageNumber: number, run: (signal: AbortSignal) => Promise<void>) {
    if (renderedPages.has(pageNumber) || active.has(pageNumber) || queuedPageNumbers.has(pageNumber)) {
      return Promise.resolve()
    }
    const job: ThumbnailJob = { pageNumber, controller: new AbortController(), run }
    queuedPageNumbers.add(pageNumber)
    pending.push(job)
    pump()
    return Promise.resolve()
  }

  function cancel(pageNumber: number) {
    const pendingIndex = pending.findIndex((job) => job.pageNumber === pageNumber)
    if (pendingIndex >= 0) {
      const [job] = pending.splice(pendingIndex, 1)
      job?.controller.abort()
      queuedPageNumbers.delete(pageNumber)
    }
    const activeJob = active.get(pageNumber)
    if (activeJob) {
      activeJob.controller.abort()
      active.delete(pageNumber)
    }
  }

  function cancelAll() {
    for (const job of pending) job.controller.abort()
    pending.length = 0
    queuedPageNumbers.clear()
    for (const job of active.values()) job.controller.abort()
    active.clear()
  }

  function reset() {
    cancelAll()
    renderedPages.clear()
  }

  function hasRenderedPage(pageNumber: number) {
    return renderedPages.has(pageNumber)
  }

  function markRendered(pageNumber: number) {
    renderedPages.add(pageNumber)
  }

  onBeforeUnmount(cancelAll)

  return {
    maxConcurrent,
    enqueue,
    cancel,
    cancelAll,
    reset,
    hasRenderedPage,
    markRendered,
  }
}
