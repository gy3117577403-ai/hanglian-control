import type { DrawingItem } from './production'

export type ViewerMode = 'pdf' | 'image' | 'text' | 'unsupported'
export type ViewerFitMode = 'actual' | 'width' | 'page'
export type ThumbnailStatus = 'idle' | 'queued' | 'loading' | 'done' | 'failed'

export interface PdfViewport {
  width: number
  height: number
}

export interface PdfPageProxy {
  getViewport(input: { scale: number; rotation?: number }): PdfViewport
  render(input: {
    canvasContext: CanvasRenderingContext2D
    viewport: unknown
  }): { promise: Promise<void>; cancel: () => void }
  cleanup?: () => void
}

export interface PdfDocumentProxy {
  numPages: number
  getPage(pageNumber: number): Promise<PdfPageProxy>
  destroy?: () => Promise<void>
}

export interface PdfLoadingTask {
  promise: Promise<PdfDocumentProxy>
  destroy?: () => Promise<void>
}

export interface PdfDocumentReadyPayload {
  source: string
  pageCount: number
  document: PdfDocumentProxy | null
}

export interface DocumentViewerItem {
  itemId: string
  documentId?: string
  title: string
  fileType?: 'pdf' | 'image' | 'text' | 'card'
  contentKind?: 'pdf' | 'image' | 'text' | 'card'
  previewUrl?: string
  downloadUrl?: string
  fileName?: string
  version: string
  remark?: string
  description?: string
  source: DrawingItem['source'] | string
  uploadedAt: string
  deleted?: boolean
  deletedAt?: string
}

export interface ViewerState {
  open: boolean
  mode: ViewerMode
  items: DocumentViewerItem[]
  activeItemIndex: number
  activePage: number
  pageCount: number
  zoom: number
  rotation: number
  fitMode: ViewerFitMode
  loading: boolean
  error: string
  fullscreen: boolean
}
