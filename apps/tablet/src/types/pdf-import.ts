export type PdfImportAction =
  | 'create_product'
  | 'add_version'
  | 'skip_duplicate'
  | 'needs_confirmation'
  | 'error'

export type PdfImportPreviewStatus =
  | 'previewed'
  | 'expired'
  | 'applying'
  | 'completed'
  | 'partially_applied'
  | 'failed'
  | 'applied'
  | 'partial'
  | 'error'

export type PdfImportApplyResult =
  | 'created_product'
  | 'added_version'
  | 'skipped_duplicate'
  | 'needs_confirmation'
  | 'skipped_by_user'
  | 'error'

export interface PdfImportCustomer {
  customerId: string
  customerName: string
  customerShortName?: string
}

export interface PdfImportPreviewSummary {
  totalFiles: number
  createProduct: number
  addVersion: number
  skipDuplicate: number
  needsConfirmation: number
  error: number
  successCount?: number
  skippedCount?: number
  errorCount?: number
  needsConfirmationCount?: number
}

export interface PdfImportPreviewItem {
  importItemId: string
  originalFileName: string
  mimeType?: string
  fileSize?: number
  checksumSha256?: string
  parsedProductModel: string
  confirmedProductModel: string
  parsedVersion?: string
  confidence: 'high' | 'medium' | 'low'
  needsConfirmation: boolean
  parseWarnings: string[]
  existingProductId?: string
  existingDocumentId?: string
  action: PdfImportAction | 'skip'
  message?: string
  errorMessage?: string
}

export interface PdfImportApplySummary {
  total: number
  createdProduct: number
  addedVersion: number
  skippedDuplicate: number
  needsConfirmation: number
  skippedByUser: number
  error: number
}

export interface PdfImportApplyResultItem {
  importItemId: string
  originalFileName: string
  confirmedProductModel: string
  productId?: string
  documentId?: string
  result: PdfImportApplyResult
  documentStatus?: string
  setAsEffective?: boolean
  message: string
  errorMessage?: string
}

export interface PdfImportPreviewResponse {
  importBatchId: string
  customer: PdfImportCustomer
  status: PdfImportPreviewStatus
  message?: string
  expiresAt?: string
  summary: PdfImportPreviewSummary
  items: PdfImportPreviewItem[]
  applySummary?: PdfImportApplySummary
  applyItems?: PdfImportApplyResultItem[]
  appliedAt?: string
}

export interface PdfImportApplyItemRequest {
  importItemId: string
  selected?: boolean
  confirmedProductModel?: string
  confirmedVersion?: string
  productName?: string
  setAsEffective?: boolean
}

export interface PdfImportApplyRequest {
  importBatchId: string
  items: PdfImportApplyItemRequest[]
  remark?: string
  operatorId?: string
  operatorName?: string
}

export interface PdfImportApplyResponse {
  importBatchId: string
  status: 'completed' | 'partially_applied' | 'failed'
  customer: PdfImportCustomer
  summary: PdfImportApplySummary
  items: PdfImportApplyResultItem[]
  appliedAt?: string
}

export interface PdfImportPreviewItemState extends PdfImportPreviewItem {
  selected: boolean
  confirmedVersion?: string
  productName?: string
  setAsEffective?: boolean
}

export type PdfImportEditableItemPatch = Partial<Pick<
  PdfImportPreviewItemState,
  'selected' | 'confirmedProductModel' | 'confirmedVersion' | 'productName' | 'setAsEffective'
>>
