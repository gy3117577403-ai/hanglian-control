import type { DrawingModule, DrawingModuleKey, HubCustomer, HubProductModel, ProductDrawingDetail } from './production'

export type LifecycleDocumentSource = 'manual_upload' | 'camera_capture' | 'pdf_import'

export interface DrawingTrashItem {
  documentId: string
  title: string
  version?: string
  customerId?: string
  customerName?: string
  productId: string
  productModel?: string
  moduleKey: DrawingModuleKey
  moduleName?: string
  originalFileName?: string
  mimeType?: string
  fileSize?: number
  source?: string
  deletedAt?: string | null
  deletedBy?: string | null
  deleteReason?: string
  previewAvailable?: boolean
  canRestore?: boolean
  canPurge?: boolean
}

export interface TrashQuery {
  customerId?: string
  productId?: string
  moduleKey?: DrawingModuleKey | string
  keyword?: string
  limit?: number
  offset?: number
}

export interface TrashDocumentPayload {
  password: string
  reason?: string
  operatorId?: string
  operatorName?: string
}

export interface RestoreDocumentPayload {
  operatorId?: string
  operatorName?: string
  remark?: string
}

export interface PurgeDocumentPayload {
  password: string
  confirmText: string
  reason?: string
  operatorId?: string
  operatorName?: string
}

export interface DeleteLockStatus {
  enabled: boolean
  hasPassword: boolean
  locked: boolean
  lockedUntil: string | null
  failedAttempts: number
}

export interface DrawingTrashListResponse {
  items: DrawingTrashItem[]
  total: number
  limit: number
  offset: number
}

export interface DrawingLifecycleResponse {
  documentId: string
  productId: string
  moduleKey: DrawingModuleKey
  deleted?: boolean
  movedToTrash?: boolean
  deletedAt?: string | null
  restored?: boolean
  restoredAt?: string | null
  purged?: boolean
  purgedAt?: string | null
  fileDeleted?: boolean
  fileMissing?: boolean
  metadataDeleted?: boolean
  warning?: string
  message?: string
  idempotent?: boolean
  product?: HubProductModel
  customer?: HubCustomer
  module?: DrawingModule
  detail?: ProductDrawingDetail
}
