import type { DrawingItem, DrawingModule, HubProductModel, ProductDrawingDetail } from './production'

export interface DrawingDocumentMetadataPayload {
  title: string
  version?: string
  keywords?: string[]
  remark?: string
  operatorId?: string
  operatorName?: string
}

export interface DrawingDocumentOperatorPayload {
  operatorId?: string
  operatorName?: string
}

export interface DrawingDocumentVersionResponse {
  success: boolean
  documentId: string
  item: DrawingItem
  module: DrawingModule
  product: HubProductModel
  detail: ProductDrawingDetail
  changedDocumentIds?: string[]
  downgradedDocumentIds?: string[]
  auditWritten?: boolean
  idempotent?: boolean
}
