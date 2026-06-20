import type { DrawingItem } from './production'

export type ViewerMode = 'pdf' | 'image' | 'text' | 'unsupported'
export type ViewerFitMode = 'actual' | 'width' | 'page'

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
