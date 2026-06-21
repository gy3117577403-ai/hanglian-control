import type {
  DrawingModuleKey,
  DrawingModuleStatus,
  HubCustomer,
  HubProductModel,
} from './production'
import type {
  CreateDrawingCustomerPayload,
  CreateDrawingProductArchivePayload,
} from './product-resolution'

export type CustomerMaintenanceStatus = NonNullable<HubCustomer['status']>

export interface UpdateDrawingCustomerPayload {
  customerName?: string
  customerShortName?: string
  customerCode?: string
  aliases?: string[]
  status?: CustomerMaintenanceStatus
}

export interface UpdateDrawingProductPayload {
  productModel?: string
  productName?: string
  remark?: string
  searchKeywords?: string[]
}

export interface MaintenanceCustomerSummary {
  productCount: number
  noDrawingCount: number
  lastUpdatedAt?: string
}

export interface MaintenanceModuleSummary {
  moduleKey: DrawingModuleKey
  moduleName: string
  status: DrawingModuleStatus
  itemCount: number
}

export interface MaintenanceProductSummary {
  moduleCount: number
  uploadedModuleCount: number
  emptyModuleCount: number
  documentCount: number
  originalDrawingCount: number
  lastDocumentUpdatedAt?: string
  modules: MaintenanceModuleSummary[]
}

export interface MaintenanceProductRow extends HubProductModel {
  maintenanceSummary: MaintenanceProductSummary
}

export interface CustomerProductMaintenanceState {
  customers: HubCustomer[]
  selectedCustomerId: string
  products: MaintenanceProductRow[]
  customerSearch: string
  productSearch: string
}

export type CreateMaintenanceCustomerPayload = CreateDrawingCustomerPayload
export type CreateMaintenanceProductPayload = CreateDrawingProductArchivePayload
