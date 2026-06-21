import type { DrawingModule, HubCustomer, HubOrder, HubProductModel } from './production'
import type { ProductionOrder } from './order-management'

export type ProductResolutionStatus =
  | 'unknown'
  | 'resolving'
  | 'found'
  | 'product_not_found'
  | 'customer_not_found'
  | 'ambiguous'
  | 'error'

export interface ResolveDrawingProductQuery {
  customerId?: string
  customerName?: string
  customerShortName?: string
  productModel: string
}

export interface ProductResolutionFound {
  status: 'found'
  customer: HubCustomer
  product: HubProductModel
  modules: DrawingModule[]
}

export interface ProductResolutionProductNotFound {
  status: 'product_not_found'
  customer: HubCustomer
  requestedProductModel: string
  normalizedProductModel: string
  message: string
}

export interface ProductResolutionCustomerNotFound {
  status: 'customer_not_found'
  requestedCustomerName?: string
  requestedCustomerShortName?: string
  requestedProductModel: string
  normalizedProductModel: string
  message: string
}

export type DrawingProductResolution =
  | ProductResolutionFound
  | ProductResolutionProductNotFound
  | ProductResolutionCustomerNotFound

export interface UnarchivedOrderProductContext {
  order: HubOrder | ProductionOrder
  source: 'orders' | 'overview'
  resolution: DrawingProductResolution | null
  status: Exclude<ProductResolutionStatus, 'unknown' | 'found'>
  message: string
}

export interface CreateDrawingCustomerPayload {
  customerName: string
  customerShortName?: string
  customerCode?: string
  aliases?: string[]
  status?: 'active' | 'disabled'
}

export interface CreateDrawingProductArchivePayload {
  customerId: string
  productModel: string
  productName?: string
  remark?: string
  source?: 'manual_create'
}
