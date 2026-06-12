export type ProcessSegment = '前段' | '后段' | '通用'
export type ActiveProcess = 'front' | 'back'
export type PlanStatus = '待生产' | '生产中' | '已完成' | '异常'
export type ConfirmationStatus = '未确认' | '已确认' | '需复核'
export type MaterialStatus = '有效' | '待确认' | '失效'
export type PlanScope = 'today' | 'week'
export type DocumentTab = 'drawing' | 'sop' | 'pin-map' | 'finish'
export type DocumentStatus = 'effective' | 'pending_review' | 'expired' | 'missing' | 'inconsistent'
export type DocumentTypeV03 =
  | 'drawing_pdf'
  | 'sop_image'
  | 'connector_manual'
  | 'pinout_diagram'
  | 'finished_detail_image'
  | 'process_card'
export type DocumentSource = 'mock' | 'wecom_disk' | 'manual_upload'
export type RequiredProcess = 'front' | 'back' | 'common'
export type PreviewType = 'pdf' | 'image' | 'card'
export type ReadinessStatus = 'ready' | 'need_review' | 'blocked'
export type CheckItemStatus = 'pass' | 'warning' | 'fail'
export type FileHealthStatus = 'ok' | 'demo' | 'missing_file' | 'unsupported' | 'broken'

export type SearchResultType =
  | 'plan'
  | 'front-parameter'
  | 'back-document'
  | 'drawing'
  | 'sop'
  | 'connector'
  | 'detail-image'

export interface VersionStatus {
  status: MaterialStatus
  message: string
  redLine: boolean
}

export interface FrontProcessParameter {
  wireLength: string
  strippingLength: string
  terminalModel: string
  pullForceStandard: string
  crimpHeight: string
  drawingVersion: string
  parameterStatus: MaterialStatus
}

export interface BackProcessPackage {
  connectorModel: string
  assemblyManual: string
  pinMap: string
  sop: string
  finishedImageCount: number
  drawingVersion: string
  sopVersion: string
  materialStatus: MaterialStatus
}

export interface ProductDocument {
  id: string
  documentId?: string
  productId?: string
  planId?: string
  type: DocumentTab
  documentType?: DocumentTypeV03
  title: string
  version: string
  status: MaterialStatus
  documentStatus?: DocumentStatus
  effectiveDate?: string
  updatedAt?: string
  source?: DocumentSource
  requiredForProcess?: RequiredProcess
  previewType?: PreviewType
  mockPreviewText?: string
  keywords?: string[]
  description: string
  localMockLabel: string
  originalFileName?: string
  storedFileName?: string
  mimeType?: string
  fileSize?: number
  previewUrl?: string
  downloadUrl?: string
  createdAt?: string
  archived?: boolean
  archivedAt?: string
  archivedBy?: string
  remark?: string
  versionGroupKey?: string
}

export interface DocumentFileHealthItem {
  documentId: string
  title: string
  documentType: DocumentTypeV03
  version: string
  source: DocumentSource
  previewType?: PreviewType
  hasStoredFile: boolean
  fileExists: boolean
  canPreview: boolean
  isDemoOnly: boolean
  healthStatus: FileHealthStatus
  message: string
}

export interface DocumentFileHealthResponse {
  scope: {
    planId?: string
    productId?: string
  }
  summary: {
    totalDocuments: number
    uploadedDocuments: number
    mockDocuments: number
    previewableDocuments: number
    missingFiles: number
    brokenPreview: number
    demoOnly: number
  }
  items: DocumentFileHealthItem[]
}

export interface DocumentFileHealthQuery {
  planId?: string
  productId?: string
}

export interface ReadinessCheckItem {
  key: string
  label: string
  required: boolean
  status: CheckItemStatus
  message: string
}

export interface VersionAlertItem {
  level: 'warning' | 'danger'
  message: string
}

export interface PlanReadiness {
  planId: string
  readinessStatus: ReadinessStatus
  score: number
  summary: string
  checkItems: ReadinessCheckItem[]
  versionAlerts: VersionAlertItem[]
}

export interface ProductionPlan {
  id: string
  date: string
  weekPlanNo: string
  sales: string
  customer: string
  customerId?: string
  productId?: string
  productCode: string
  productName: string
  productVersion: string
  segment: ProcessSegment
  plannedQuantity: number
  completedQuantity: number
  status: PlanStatus
  owner: string
  materialCompleteness: number
  confirmationStatus: ConfirmationStatus
  versionStatus?: VersionStatus
  querySuggestions?: string[]
  front: FrontProcessParameter
  back: BackProcessPackage
  documents: ProductDocument[]
  readiness?: PlanReadiness
}

export interface QueryRecord {
  id: string
  text: string
  time: string
  planId?: string
  source: '搜索' | '语音' | '切换' | '确认'
}

export type FeedbackType =
  | '资料缺失'
  | '版本异常'
  | '参数不一致'
  | '图纸不清晰'
  | 'SOP 与现场不符'
  | '其他'

export interface FeedbackRecord {
  id: string
  planId: string
  type: FeedbackType | string
  description: string
  createdAt: string
  userId?: string
  userName?: string
  owner?: string
}

export interface SearchHit {
  id: string
  planId: string
  title: string
  subtitle: string
  type: SearchResultType | '计划' | '产品' | '前段参数' | '后段资料' | '文件资料'
  scope?: 'current_plan' | 'global'
  matchedField?: string
  snippet?: string
  version?: string
  status?: DocumentStatus
  source?: DocumentSource
  isEffective?: boolean
  isHistorical?: boolean
  versionGroupKey?: string
}

export interface ConfirmProductionPlanPayload {
  userId: string
  userName: string
  role: '前段组长' | '后段组长'
}

export interface SubmitFeedbackPayload {
  planId: string
  type: FeedbackType
  description: string
  userId: string
  userName: string
}

export interface HealthResponse {
  status: 'ok' | string
  service: string
  version: string
  dataSource?: 'mock' | 'prisma'
}

export interface DataSourceStatus {
  dataSource: 'mock' | 'prisma'
  databaseConfigured: boolean
  databaseUrlMasked?: string
  databaseUrlLooksExample?: boolean
  databaseUrlLooksProduction?: boolean
  envLocalExists?: boolean
  dbTarget?: string
  allowTestDbConnect?: boolean
  allowPrismaWrite?: boolean
  allowDestructiveDbActions?: boolean
  prismaAvailable?: boolean
  canReadDatabase?: boolean
  canWriteDatabase?: boolean
  stage?: string
  message: string
}

export interface DatabaseSafetyStatus {
  dataSource: 'mock' | 'prisma'
  dbTarget: string
  databaseConfigured: boolean
  databaseUrlMasked: string
  databaseUrlLooksExample: boolean
  databaseUrlLooksProduction: boolean
  envLocalExists: boolean
  allowTestDbConnect: boolean
  allowPrismaWrite: boolean
  allowDestructiveDbActions: boolean
  prismaAvailable: boolean
  canReadDatabase: boolean
  canWriteDatabase: boolean
  destructiveActionsAllowed: boolean
  stage: 'V0.8A_READONLY_CHECK'
  dryRun: boolean
  warnings: string[]
  nextSteps: string[]
  message: string
}

export interface DocumentQuery {
  planId?: string
  productId?: string
  documentType?: DocumentTypeV03
  status?: DocumentStatus
}

export interface UpdateDocumentStatusPayload {
  status: DocumentStatus
  reason?: string
}

export interface UpdateDocumentVersionPayload {
  version: string
  status?: DocumentStatus
}

export interface SetEffectiveDocumentPayload {
  reason?: string
  operatorId?: string
  operatorName?: string
  operatorRole?: string
}

export interface DocumentVersionQuery {
  productId: string
  documentType?: DocumentTypeV03
  requiredForProcess?: RequiredProcess
}

export interface DocumentVersionGroup {
  versionGroupKey: string
  productId: string
  documentType: DocumentTypeV03
  requiredForProcess: RequiredProcess
  currentDocument?: ProductDocument
  versions: ProductDocument[]
  effectiveDocumentId?: string
  versionCount: number
  hasExpired: boolean
  hasPendingReview: boolean
  hasInconsistent: boolean
}

export interface DocumentVersionsResponse extends DocumentVersionGroup {
  currentDocument: ProductDocument
}

export interface DocumentCompareField {
  field: string
  label: string
  values: Array<string | number | string[] | undefined>
  different: boolean
}

export interface DocumentCompareResult {
  documents: ProductDocument[]
  fields: DocumentCompareField[]
}

export interface SetEffectiveDocumentResult {
  document: ProductDocument
  versions: DocumentVersionsResponse
  readiness?: PlanReadiness
}

export type AuditEntityType = 'document' | 'plan' | 'feedback' | 'file' | 'system'
export type AuditAction =
  | 'document_uploaded'
  | 'document_status_changed'
  | 'document_version_changed'
  | 'document_set_effective'
  | 'document_archived'
  | 'document_previewed'
  | 'document_downloaded'
  | 'readiness_recalculated'
  | 'migration_preview_generated'

export interface AuditLog {
  auditId: string
  entityType: AuditEntityType
  entityId: string
  action: AuditAction
  before?: unknown
  after?: unknown
  message: string
  operatorId: string
  operatorName: string
  operatorRole: string
  planId?: string
  productId?: string
  createdAt: string
}

export interface AuditLogQuery {
  entityType?: AuditEntityType
  entityId?: string
  planId?: string
  productId?: string
  action?: AuditAction
  limit?: number
}

export interface MigrationPreview {
  dataSource: 'mock' | 'prisma'
  target: 'prisma_postgresql'
  safeToMigrate: boolean
  summary: {
    customers: number
    products: number
    productionPlans: number
    documents: number
    uploadedDocuments: number
    auditLogs: number
    feedbackRecords: number
    confirmationRecords: number
  }
  warnings: string[]
}

export interface MigrationValidation {
  checkedAt: string
  valid: boolean
  summary: MigrationPreview['summary'] & {
    users?: number
    frontParameters?: number
    backPackages?: number
    queryLogs?: number
  }
  environment?: {
    envLocalExists: boolean
    dataSource: 'mock' | 'prisma'
    dbTarget: string
    databaseConfigured: boolean
    databaseUrlMasked: string
    allowTestDbConnect: boolean
    allowPrismaWrite: boolean
    allowDestructiveDbActions: boolean
    dryRun: boolean
    message: string
  }
  errors: string[]
  warnings: string[]
  safety: DatabaseSafetyStatus
}

export interface PrismaSeedPreview {
  generatedAt: string
  mode: 'dry-run'
  summary: MigrationValidation['summary']
  environment?: MigrationValidation['environment']
  errors: string[]
  warnings: string[]
  safety: DatabaseSafetyStatus
  seed: Record<string, unknown[]>
}
