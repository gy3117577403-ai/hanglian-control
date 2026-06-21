import type { DrawingModuleKey, DrawingStatus, HubMode } from './production'

export type DrawingSearchResultType = 'customer' | 'product' | 'document'

export interface DrawingSearchResultBase {
  resultType: DrawingSearchResultType
  title: string
  subtitle: string
  matchedText: string
  score: number
}

export interface DrawingCustomerSearchResult extends DrawingSearchResultBase {
  resultType: 'customer'
  customerId: string
  customerName: string
  customerShortName: string
  productCount: number
}

export interface DrawingProductSearchResult extends DrawingSearchResultBase {
  resultType: 'product'
  customerId: string
  customerName: string
  productId: string
  productModel: string
  productName: string
  drawingStatus: DrawingStatus
  uploadedModuleCount: number
  moduleCount: number
}

export interface DrawingDocumentSearchResult extends DrawingSearchResultBase {
  resultType: 'document'
  customerId: string
  customerName: string
  productId: string
  productModel: string
  moduleKey: DrawingModuleKey
  moduleName: string
  documentId: string
  itemId: string
  documentTitle: string
  version: string
  contentKind: 'pdf' | 'image' | 'text' | 'card'
  previewAvailable: boolean
}

export type DrawingSearchResult =
  | DrawingCustomerSearchResult
  | DrawingProductSearchResult
  | DrawingDocumentSearchResult

export interface DrawingSearchGroupedResults {
  customers: DrawingCustomerSearchResult[]
  products: DrawingProductSearchResult[]
  documents: DrawingDocumentSearchResult[]
}

export interface DrawingSearchResponse {
  mode: 'drawing'
  query: string
  total: number
  groups: DrawingSearchGroupedResults
  results: DrawingSearchResult[]
}

export interface ScopedHubSearchResponse {
  mode: HubMode
  items?: unknown[]
}
