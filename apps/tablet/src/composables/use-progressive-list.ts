import { computed, onBeforeUnmount, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

export type ProgressiveListOptions = {
  threshold?: number
  initialCount?: number
  step?: number
  preloadDistance?: number
}

export function useProgressiveList<T>(
  source: MaybeRefOrGetter<readonly T[]>,
  options: ProgressiveListOptions = {},
) {
  const threshold = options.threshold ?? 40
  const initialCount = options.initialCount ?? Math.min(threshold, 24)
  const step = options.step ?? initialCount
  const preloadDistance = options.preloadDistance ?? 220
  const visibleCount = ref(initialCount)
  let frame = 0

  const allItems = computed(() => toValue(source) ?? [])
  const progressiveEnabled = computed(() => allItems.value.length > threshold)
  const visibleItems = computed(() => {
    if (!progressiveEnabled.value) return allItems.value
    return allItems.value.slice(0, visibleCount.value)
  })

  function reset() {
    visibleCount.value = progressiveEnabled.value ? Math.min(initialCount, allItems.value.length) : allItems.value.length
  }

  function loadMore() {
    if (!progressiveEnabled.value) return
    visibleCount.value = Math.min(allItems.value.length, visibleCount.value + step)
  }

  function onScroll(event: Event) {
    if (!progressiveEnabled.value || frame) return

    frame = window.requestAnimationFrame(() => {
      frame = 0
      const target = event.currentTarget as HTMLElement | null
      if (!target) return
      if (target.scrollTop + target.clientHeight >= target.scrollHeight - preloadDistance) {
        loadMore()
      }
    })
  }

  watch(() => [allItems.value.length, progressiveEnabled.value] as const, reset, { immediate: true })

  onBeforeUnmount(() => {
    if (frame) window.cancelAnimationFrame(frame)
  })

  return {
    visibleItems,
    visibleCount,
    progressiveEnabled,
    loadMore,
    onScroll,
    reset,
  }
}
