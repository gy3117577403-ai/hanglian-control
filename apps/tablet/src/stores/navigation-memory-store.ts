import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DrawingModuleKey, DrawingViewLevel, HubMode } from '@/types/production'

export interface DrawingBreadcrumbPoint {
  level: DrawingViewLevel
  customerId?: string
  productId?: string
  moduleKey?: DrawingModuleKey
  itemId?: string
}

export interface ReturnPoint {
  source: 'orders' | 'search' | 'drawing'
  label: string
  state: DrawingBreadcrumbPoint
  scrollKey?: string
}

export const useNavigationMemoryStore = defineStore('navigation-memory-store', () => {
  const lastFunction = ref<HubMode>('drawing')
  const drawingBreadcrumb = ref<DrawingBreadcrumbPoint[]>([{ level: 'customers' }])
  const scrollPositions = ref<Record<string, number>>({})
  const lastOrderPosition = ref(0)
  const lastSearchState = ref({ keyword: '', mode: 'drawing' as HubMode })
  const detailReturnStack = ref<ReturnPoint[]>([])

  function pushReturnPoint(point: ReturnPoint) {
    detailReturnStack.value.push(point)
  }

  function popReturnPoint() {
    return detailReturnStack.value.pop()
  }

  function saveScrollPosition(key: string, value: number) {
    scrollPositions.value[key] = value
  }

  function restoreScrollPosition(key: string) {
    return scrollPositions.value[key] ?? 0
  }

  function rememberBreadcrumb(points: DrawingBreadcrumbPoint[]) {
    drawingBreadcrumb.value = points
  }

  function rememberFunction(mode: HubMode) {
    lastFunction.value = mode
  }

  return {
    lastFunction,
    drawingBreadcrumb,
    scrollPositions,
    lastOrderPosition,
    lastSearchState,
    detailReturnStack,
    pushReturnPoint,
    popReturnPoint,
    saveScrollPosition,
    restoreScrollPosition,
    rememberBreadcrumb,
    rememberFunction,
  }
})
