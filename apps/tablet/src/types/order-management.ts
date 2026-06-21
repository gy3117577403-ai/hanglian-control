import type { HubCustomer, HubProductModel } from './production'

export type OrderScope = 'today' | 'week'
export type OrderQueryScope = OrderScope | 'all'
export type OrderProductionStatus = 'front' | 'back' | 'no_drawing'
export type OrderCompletionStatus = 'pending' | 'completed'
export type OrderCompletionFilter = OrderCompletionStatus | 'all'
export type OrderResolutionStatus =
  | 'found'
  | 'product_not_found'
  | 'customer_not_found'
  | 'ambiguous'
  | 'unknown'
  | 'resolving'
  | 'error'
export type OrderSource = 'excel_import' | 'manual_create' | 'seed'
export type OrderImportAction =
  | 'create_order'
  | 'already_active'
  | 'duplicate_in_file'
  | 'needs_customer_confirmation'
  | 'product_not_found'
  | 'error'
export type OrderImportApplyResult =
  | 'created'
  | 'skipped_duplicate'
  | 'already_active'
  | 'needs_confirmation'
  | 'skipped_by_user'
  | 'error'

export interface ProductionOrder {
  orderId: string
  scope: OrderScope
  productId?: string
  productModel: string
  normalizedProductModel: string
  customerId?: string | null
  customerName: string
  linkedProductId?: string | null
  productResolutionStatus: OrderResolutionStatus
  quantity?: number | null
  quantityProvided: boolean
  productionStatus: OrderProductionStatus
  completionStatus: OrderCompletionStatus
  source: OrderSource
  importBatchId?: string | null
  importItemId?: string | null
  remark?: string | null
  plannedDate?: string | null
  completedAt?: string | null
  completedBy?: string | null
  restoredAt?: string | null
  restoredBy?: string | null
  createdAt: string
  updatedAt: string
  status: OrderProductionStatus
  completed: boolean
  resolvedProductId?: string
  productResolutionCheckedAt?: string
}

export interface OrderListQuery {
  scope?: OrderQueryScope
  completionStatus?: OrderCompletionFilter
  productionStatus?: OrderProductionStatus
  keyword?: string
  customerId?: string
  linkedProductId?: string
}

export interface OrderImportPreviewItem {
  importItemId: string
  rowNumber: number
  rawProductModel: string
  productModel: string
  normalizedProductModel: string
  productResolutionStatus: OrderResolutionStatus
  matchedCustomerId?: string | null
  matchedCustomerName?: string | null
  matchedProductId?: string | null
  recommendedProductionStatus: OrderProductionStatus
  action: OrderImportAction
  message?: string
  errorMessage?: string
}

export interface OrderImportPreviewItemState extends OrderImportPreviewItem {
  selected: boolean
  confirmedCustomerId?: string
  confirmedProductId?: string
  remark?: string
}

export interface OrderImportPreviewResponse {
  importBatchId: string
  scope: OrderScope
  status: 'previewed' | 'expired' | 'applying' | 'completed' | 'partially_applied' | 'failed'
  totalRows: number
  summary: {
    createOrder: number
    alreadyActive: number
    duplicateInFile: number
    needsConfirmation: number
    productNotFound: number
    error: number
  }
  expiresAt?: string | null
  items: OrderImportPreviewItem[]
}

export interface OrderImportApplyItemRequest {
  importItemId: string
  selected?: boolean
  confirmedCustomerId?: string
  confirmedProductId?: string
  remark?: string
}

export interface OrderImportApplyRequest {
  importBatchId: string
  items: OrderImportApplyItemRequest[]
  operatorId?: string
  operatorName?: string
}

export interface OrderImportApplyItem {
  importItemId: string
  orderId?: string
  result: OrderImportApplyResult
  message: string
  errorMessage?: string
  appliedAt?: string
}

export interface OrderImportApplyResponse {
  importBatchId: string
  scope: OrderScope
  status: 'completed' | 'partially_applied' | 'failed'
  summary: {
    created: number
    skippedDuplicate: number
    alreadyActive: number
    needsConfirmation: number
    skippedByUser: number
    error: number
  }
  appliedAt?: string | null
  items: OrderImportApplyItem[]
}

export interface OrderOperatorPayload {
  operatorId?: string
  operatorName?: string
}

export interface OrderStatusPayload extends OrderOperatorPayload {
  productionStatus: OrderProductionStatus
}

export interface OrderProductLinkPayload extends OrderOperatorPayload {
  customerId: string
  productId: string
}

export interface OrderScopeOverview {
  total: number
  pending: number
  completed: number
  front: number
  back: number
  noDrawing: number
  items: ProductionOrder[]
}

export interface OrderOverviewResponse {
  today?: OrderScopeOverview
  week?: OrderScopeOverview
  completed?: {
    todayCompleted: number
    weekCompleted: number
    recentItems: ProductionOrder[]
  }
  weekOrders: ProductionOrder[]
  pendingOrders: ProductionOrder[]
  completedOrders: ProductionOrder[]
  summary: {
    weekTotal: number
    pendingTotal: number
    completedTotal: number
  }
}

export interface OrderProductLinkCandidate {
  customer: HubCustomer
  products: HubProductModel[]
}
