import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DrawingModuleKey, HubMode } from '@/types/production'

export type DrawingNavigationSource =
  | 'order'
  | 'orders'
  | 'overview'
  | 'search'
  | 'customer_maintenance'
  | 'pdf_import_result'
  | 'product_list'
  | 'module'
  | 'direct_url'
  | 'drawing'
  | 'maintenance'

export interface DrawingNavigationSnapshot {
  source: DrawingNavigationSource
  sourceRoute?: string
  sourceQuery?: Record<string, string>
  sourceScrollTop?: number
  selectedCustomerId?: string
  selectedProductId?: string
  selectedModuleKey?: DrawingModuleKey
  selectedDocumentId?: string
  searchQuery?: string
  searchMode?: HubMode
  searchResultScrollTop?: number
  orderScope?: string
  orderListScrollTop?: number
  maintenanceCustomerScrollTop?: number
  maintenanceProductScrollTop?: number
}

export const useDrawingNavigationStore = defineStore('drawing-navigation-store', () => {
  const returnStack = ref<DrawingNavigationSnapshot[]>([])
  const lastSource = ref<DrawingNavigationSnapshot | null>(null)

  function rememberSource(snapshot: DrawingNavigationSnapshot) {
    lastSource.value = snapshot
    returnStack.value.push(snapshot)
  }

  function peekSource() {
    return returnStack.value[returnStack.value.length - 1] ?? lastSource.value
  }

  function popSource() {
    const snapshot = returnStack.value.pop() ?? lastSource.value
    lastSource.value = returnStack.value[returnStack.value.length - 1] ?? snapshot ?? null
    return snapshot ?? null
  }

  function clearDrawingNavigation() {
    returnStack.value = []
    lastSource.value = null
  }

  return {
    returnStack,
    lastSource,
    rememberSource,
    peekSource,
    popSource,
    clearDrawingNavigation,
  }
})
