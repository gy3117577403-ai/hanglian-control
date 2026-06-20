import { computed, reactive } from 'vue'
import type { DocumentViewerItem, ViewerFitMode, ViewerMode, ViewerState } from '@/types/document-viewer'

const minZoom = 0.5
const maxZoom = 3
const zoomStep = 0.25

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function itemMode(item?: DocumentViewerItem | null): ViewerMode {
  const kind = item?.contentKind ?? item?.fileType
  if (kind === 'pdf') return 'pdf'
  if (kind === 'image') return 'image'
  if (kind === 'text' || kind === 'card') return 'text'
  return 'unsupported'
}

export function useDocumentViewer() {
  const state = reactive<ViewerState>({
    open: false,
    mode: 'unsupported',
    items: [],
    activeItemIndex: 0,
    activePage: 1,
    pageCount: 1,
    zoom: 1,
    rotation: 0,
    fitMode: 'page',
    loading: false,
    error: '',
    fullscreen: false,
  })

  const activeItem = computed(() => state.items[state.activeItemIndex] ?? null)
  const zoomPercent = computed(() => `${Math.round(state.zoom * 100)}%`)
  const canPreviousItem = computed(() => state.activeItemIndex > 0)
  const canNextItem = computed(() => state.activeItemIndex < state.items.length - 1)
  const canPreviousPage = computed(() => state.mode === 'pdf' && state.activePage > 1)
  const canNextPage = computed(() => state.mode === 'pdf' && state.activePage < state.pageCount)

  function setItems(items: DocumentViewerItem[], initialItemId?: string) {
    state.items = items.filter((item) => !item.deleted && !item.deletedAt)
    const index = Math.max(0, state.items.findIndex((item) => item.itemId === initialItemId || item.documentId === initialItemId))
    state.activeItemIndex = index >= 0 ? index : 0
    resetForActiveItem()
  }

  function resetForActiveItem() {
    state.activePage = 1
    state.pageCount = 1
    state.zoom = 1
    state.rotation = 0
    state.fitMode = 'page'
    state.loading = false
    state.error = ''
    state.mode = itemMode(activeItem.value)
  }

  function setActiveItemIndex(index: number) {
    state.activeItemIndex = clamp(index, 0, Math.max(state.items.length - 1, 0))
    resetForActiveItem()
  }

  function setActivePage(page: number) {
    state.activePage = clamp(Math.round(page), 1, Math.max(state.pageCount, 1))
  }

  function setPageCount(count: number) {
    state.pageCount = Math.max(1, Math.floor(count) || 1)
    setActivePage(state.activePage)
  }

  function setZoom(value: number) {
    state.zoom = clamp(value, minZoom, maxZoom)
  }

  function zoomIn() {
    state.fitMode = 'actual'
    setZoom(state.zoom + zoomStep)
  }

  function zoomOut() {
    state.fitMode = 'actual'
    setZoom(state.zoom - zoomStep)
  }

  function reset() {
    state.zoom = 1
    state.rotation = 0
    state.fitMode = 'actual'
  }

  function fitWidth() {
    state.fitMode = 'width'
  }

  function fitPage() {
    state.fitMode = 'page'
  }

  function setFitZoom(mode: ViewerFitMode, zoom: number) {
    state.fitMode = mode
    setZoom(zoom)
  }

  function rotateClockwise() {
    state.rotation = (state.rotation + 90) % 360
  }

  function rotateCounterClockwise() {
    state.rotation = (state.rotation + 270) % 360
  }

  function previousItem() {
    if (!canPreviousItem.value) return false
    setActiveItemIndex(state.activeItemIndex - 1)
    return true
  }

  function nextItem() {
    if (!canNextItem.value) return false
    setActiveItemIndex(state.activeItemIndex + 1)
    return true
  }

  function previous() {
    if (state.mode === 'pdf' && state.activePage > 1) {
      setActivePage(state.activePage - 1)
      return true
    }
    return previousItem()
  }

  function next() {
    if (state.mode === 'pdf' && state.activePage < state.pageCount) {
      setActivePage(state.activePage + 1)
      return true
    }
    return nextItem()
  }

  function setLoading(value: boolean) {
    state.loading = value
  }

  function setError(message = '') {
    state.error = message
    state.loading = false
  }

  function clearError() {
    state.error = ''
  }

  function setFullscreen(value: boolean) {
    state.fullscreen = value
  }

  function close() {
    state.open = false
    state.items = []
    state.activeItemIndex = 0
    state.activePage = 1
    state.pageCount = 1
    state.zoom = 1
    state.rotation = 0
    state.fitMode = 'page'
    state.loading = false
    state.error = ''
    state.fullscreen = false
    state.mode = 'unsupported'
  }

  return {
    state,
    activeItem,
    zoomPercent,
    canPreviousItem,
    canNextItem,
    canPreviousPage,
    canNextPage,
    setItems,
    setActiveItemIndex,
    setActivePage,
    setPageCount,
    setZoom,
    setFitZoom,
    zoomIn,
    zoomOut,
    reset,
    fitWidth,
    fitPage,
    rotateClockwise,
    rotateCounterClockwise,
    previous,
    next,
    previousItem,
    nextItem,
    setLoading,
    setError,
    clearError,
    setFullscreen,
    close,
  }
}
