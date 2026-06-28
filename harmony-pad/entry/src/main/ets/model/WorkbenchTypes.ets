export type OrderScope = 'today' | 'week'

export type DocumentCategoryKey =
  | 'original_drawing'
  | 'sop'
  | 'finished_image'
  | 'auxiliary_spec'
  | 'notice'
  | 'tooling'

export type UploadStatus = 'uploaded' | 'missing' | 'pending' | 'expired'

export interface DocumentCategoryDefinition {
  category: DocumentCategoryKey
  label: string
  documentType: string
}

export interface WorkbenchOrder {
  id: string
  orderId: string
  date: string
  weekPlanNo: string
  customerId: string
  customerName: string
  productId: string
  productModel: string
  productName: string
  quantity: number
  completedQuantity: number
  productionStatus: string
  status: string
  completed: boolean
}

export interface WorkbenchDocument {
  id: string
  documentId: string
  customerId: string
  productId: string
  orderId: string
  category: DocumentCategoryKey
  documentType: string
  title: string
  version: string
  pageCount: number
  updatedAt: string
  effectiveDate: string
  uploadStatus: UploadStatus
  previewUrl: string
  downloadUrl: string
  source: string
}

export interface DocumentCategoryState {
  category: DocumentCategoryKey
  label: string
  documentType: string
  uploadStatus: UploadStatus
  title: string
  version: string
  pageCount: number
  date: string
  documents: WorkbenchDocument[]
}

export const DOCUMENT_CATEGORY_DEFINITIONS: DocumentCategoryDefinition[] = [
  { category: 'original_drawing', label: '原图', documentType: 'drawing_pdf' },
  { category: 'sop', label: 'SOP 指导书', documentType: 'sop_image' },
  { category: 'finished_image', label: '成品图', documentType: 'finished_detail_image' },
  { category: 'auxiliary_spec', label: '辅料规格', documentType: 'connector_manual' },
  { category: 'notice', label: '注意事项', documentType: 'pinout_diagram' },
  { category: 'tooling', label: '配套工装', documentType: 'process_card' }
]

export function emptyDocumentCategories(): DocumentCategoryState[] {
  return DOCUMENT_CATEGORY_DEFINITIONS.map((item: DocumentCategoryDefinition): DocumentCategoryState => {
    return {
      category: item.category,
      label: item.label,
      documentType: item.documentType,
      uploadStatus: 'missing',
      title: item.label,
      version: '-',
      pageCount: 0,
      date: '-',
      documents: []
    }
  })
}

export function documentCategoryByKey(category: DocumentCategoryKey): DocumentCategoryDefinition {
  const match = DOCUMENT_CATEGORY_DEFINITIONS.find((item: DocumentCategoryDefinition) => item.category === category)
  return match ?? DOCUMENT_CATEGORY_DEFINITIONS[0]
}

export function documentCategoryForType(documentType: string): DocumentCategoryKey {
  if (documentType === 'drawing_pdf' || documentType === 'drawing' || documentType === 'original_drawing') return 'original_drawing'
  if (documentType === 'sop_image' || documentType === 'sop') return 'sop'
  if (documentType === 'finished_detail_image' || documentType === 'finished_image' || documentType === 'finished_images') return 'finished_image'
  if (documentType === 'connector_manual' || documentType === 'auxiliary_spec' || documentType === 'accessory_specs') return 'auxiliary_spec'
  if (documentType === 'pinout_diagram' || documentType === 'notice' || documentType === 'notes') return 'notice'
  return 'tooling'
}

export function normalizeCategoryAlias(value: string): DocumentCategoryKey {
  if (value === 'original_drawing') return 'original_drawing'
  if (value === 'sop') return 'sop'
  if (value === 'finished_image' || value === 'finished_images') return 'finished_image'
  if (value === 'auxiliary_spec' || value === 'accessory_specs') return 'auxiliary_spec'
  if (value === 'notice' || value === 'notes') return 'notice'
  if (value === 'tooling') return 'tooling'
  return documentCategoryForType(value)
}

export function displayOrderStatus(status: string): string {
  if (status === 'front') return '前段生产'
  if (status === 'back') return '后段生产'
  if (status === 'no_drawing') return '缺少图纸'
  if (status === 'exception') return '异常待处理'
  if (status === 'completed') return '已完成'
  if (status === 'pending') return '待生产'
  if (status.length === 0) return '待确认'
  return status
}

export function displayUploadStatus(status: UploadStatus): string {
  if (status === 'uploaded') return '已上传'
  if (status === 'pending') return '待复核'
  if (status === 'expired') return '已过期'
  return '待上传'
}

export function formatDateText(value: string): string {
  if (!value || value === '-') return '-'
  if (value.length >= 10) return value.slice(0, 10)
  return value
}
