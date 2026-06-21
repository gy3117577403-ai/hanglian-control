import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export type TabletPerformanceTier = 'standard' | 'reduced'

const prefersReducedMotion = ref(false)
let motionQuery: MediaQueryList | null = null
let listenerBound = false

function deviceMemory() {
  if (typeof navigator === 'undefined') return 0
  const memory = Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 0)
  return Number.isFinite(memory) ? memory : 0
}

function hardwareConcurrency() {
  if (typeof navigator === 'undefined') return 8
  return Number(navigator.hardwareConcurrency || 8)
}

function hasCoarsePointer() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(pointer: coarse)').matches
}

function isAndroidTabletLike() {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent) && hasCoarsePointer()
}

function readPrefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function detectTabletPerformanceTier(): TabletPerformanceTier {
  const memory = deviceMemory()
  const cores = hardwareConcurrency()
  const reducedMotion = prefersReducedMotion.value || readPrefersReducedMotion()

  if (reducedMotion) return 'reduced'
  if (memory > 0 && memory <= 4) return 'reduced'
  if (cores > 0 && cores <= 4) return 'reduced'
  if (isAndroidTabletLike() && ((memory > 0 && memory <= 6) || cores <= 6)) return 'reduced'

  return 'standard'
}

export function isReducedTabletPerformance() {
  return detectTabletPerformanceTier() === 'reduced'
}

export function useTabletPerformance() {
  const performanceTier = computed<TabletPerformanceTier>(() => detectTabletPerformanceTier())

  function updateMotionPreference(event?: MediaQueryListEvent) {
    prefersReducedMotion.value = Boolean(event?.matches ?? motionQuery?.matches ?? readPrefersReducedMotion())
  }

  onMounted(() => {
    updateMotionPreference()
    if (listenerBound || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    motionQuery.addEventListener?.('change', updateMotionPreference)
    listenerBound = true
  })

  onBeforeUnmount(() => {
    if (!listenerBound || !motionQuery) return
    motionQuery.removeEventListener?.('change', updateMotionPreference)
    motionQuery = null
    listenerBound = false
  })

  return {
    performanceTier,
    prefersReducedMotion,
  }
}
