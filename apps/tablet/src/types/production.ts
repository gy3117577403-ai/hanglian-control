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
  | 'fixture'
  | 'abnormal_case'
  | 'quality_standard'

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
  duplicateVersionWarning?: string
  recommendedAction?: string
}

export interface DocumentFileHealthItem {
  documentId: string
  title: string
  documentType: DocumentTypeV03
  version: string
  versionGroupKey?: string
  source: DocumentSource
  previewType?: PreviewType
  hasStoredFile: boolean
  fileExists: boolean
  canPreview: boolean
  isDemoOnly: boolean
  isEffective?: boolean
  isHistorical?: boolean
  isPendingReview?: boolean
  largeFileWarning?: boolean
  duplicateVersionWarning?: string
  healthStatus: FileHealthStatus
  message: string
  recommendedAction?: string
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
    effectiveUploadedDocuments?: number
    pendingReviewDocuments?: number
    expiredDocuments?: number
    unsupportedDocuments?: number
    largeFileWarnings?: number
    duplicateVersionGroups?: number
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
  authMode?: 'mock'
  authProvider?: 'local_mock'
  wecomLoginEnabled?: boolean
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
  authMode?: 'mock'
  authProvider?: 'local_mock'
  wecomLoginEnabled?: boolean
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

export type AuditEntityType = 'document' | 'plan' | 'feedback' | 'file' | 'system' | 'import' | 'knowledge'
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
  | 'business_data_imported'
  | 'maintenance_recorded'

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

export type ImportType = 'production_plan' | 'customer_product' | 'front_parameter' | 'back_package' | 'fixture' | 'abnormal_case' | 'quality_standard'
export type ImportRowStatus = 'valid' | 'warning' | 'error'

export interface ImportTemplateField {
  field: string
  required: boolean
  description: string
  example?: string | number
}

export interface ImportTemplateDefinition {
  type: ImportType
  label: string
  description: string
  fields: ImportTemplateField[]
}

export interface ImportPreviewRow {
  rowNumber: number
  data: Record<string, string | number>
  normalized: Record<string, string | number>
  status: ImportRowStatus
  messages: string[]
}

export interface ImportPreviewResult {
  previewId: string
  importType: ImportType
  importTypeLabel: string
  fileName: string
  totalRows: number
  validRows: number
  warningRows: number
  errorRows: number
  columns: string[]
  rows: ImportPreviewRow[]
  summary: Record<string, number>
  createdAt: string
}

export interface ImportApplyPayload {
  previewId: string
  operatorId: string
  operatorName: string
  operatorRole?: string
  operatorTeam?: string
  remark?: string
}

export interface ImportRecord {
  id: string
  importType: ImportType
  importTypeLabel: string
  fileName: string
  status: '成功' | '有警告' | '失败'
  totalRows: number
  validRows: number
  warningRows: number
  errorRows: number
  summary: Record<string, number>
  operatorId: string
  operatorName: string
  remark?: string
  createdAt: string
  previewId?: string
  messages: string[]
}

export interface ImportApplyResult {
  success: boolean
  message: string
  record: ImportRecord
  dataSource: 'mock-metadata'
}

export interface ImportRollbackPreview {
  importRecordId: string
  importType: ImportType
  affectedPlans: number
  affectedProducts: number
  affectedCustomers: number
  affectedParameters: number
  affectedBackPackages: number
  canRollback: false
  message: string
}

export type MockRole =
  | 'front_leader'
  | 'back_leader'
  | 'maintainer'
  | 'process_engineer'
  | 'quality'
  | 'admin'

export type Permission =
  | 'plan.view'
  | 'plan.view.all'
  | 'plan.confirm'
  | 'plan.update'
  | 'plan.feedback'
  | 'front.view'
  | 'front.parameter.view'
  | 'front.parameter.update'
  | 'back.view'
  | 'back.package.view'
  | 'back.package.update'
  | 'document.view'
  | 'document.upload'
  | 'document.update'
  | 'document.set_effective'
  | 'document.archive'
  | 'document.audit.view'
  | 'import.view'
  | 'import.preview'
  | 'import.apply'
  | 'import.history.view'
  | 'maintenance.view'
  | 'maintenance.customer.update'
  | 'maintenance.product.update'
  | 'maintenance.plan.update'
  | 'maintenance.parameter.update'
  | 'maintenance.package.update'
  | 'maintenance.document.update'
  | 'maintenance.review.resolve'
  | 'knowledge.fixture.view'
  | 'knowledge.fixture.create'
  | 'knowledge.fixture.update'
  | 'knowledge.abnormal.view'
  | 'knowledge.abnormal.create'
  | 'knowledge.abnormal.update'
  | 'knowledge.quality.view'
  | 'knowledge.quality.create'
  | 'knowledge.quality.update'
  | 'knowledge.history.view'
  | 'system.info.view'
  | 'system.diagnostics.view'
  | 'system.demo_tools.view'
  | 'system.roadmap.view'
  | 'system.freeze_check.view'
  | 'admin.user.view'
  | 'admin.permission.view'
  | 'admin.all'

export interface MockUser {
  userId: string
  role: MockRole
  roleLabel: string
  name: string
  team: string
  description: string
  permissions?: Permission[]
}

export interface AuthSession {
  token: string
  user: MockUser
  permissions: Permission[]
}

export interface PermissionMatrixResponse {
  mode: 'mock'
  provider: 'local_mock'
  allPermissions: Permission[]
  rolePermissions: Record<MockRole, Permission[]>
}

export type MaintenanceEntityType =
  | 'customer'
  | 'product'
  | 'production_plan'
  | 'front_parameter'
  | 'back_package'
  | 'document'
  | 'import_record'
  | 'review_queue'

export interface MaintenanceSummary {
  customers: number
  products: number
  productionPlans: number
  frontParameters: number
  backPackages: number
  documents: number
  pendingReview: number
  expiredDocuments: number
  inconsistentItems: number
  lastImportAt?: string
  lastMaintenanceAt?: string
}

export interface MaintenanceQuery {
  keyword?: string
  status?: string
  customerId?: string
  productId?: string
  processSegment?: string
  confirmStatus?: string
  documentType?: string
  source?: string
  requiredForProcess?: string
  scope?: PlanScope | 'all'
  entityType?: MaintenanceEntityType
  entityId?: string
  operatorId?: string
  limit?: number
}

export interface MaintenanceCustomer {
  id: string
  sales?: string
  customerName: string
  customerShortName?: string
  status?: string
  statusLabel?: string
  productCount?: number
  updatedAt?: string
  remark?: string
}

export interface MaintenanceProduct {
  id: string
  customerId?: string
  customer?: string
  productCode: string
  productName: string
  productVersion?: string
  productCategory?: string
  processSegment?: string
  status?: string
  statusLabel?: string
  aliases?: string[]
  updatedAt?: string
  remark?: string
}

export interface MaintenanceProductionPlan {
  id: string
  planDate?: string
  weekPlanCode?: string
  sales?: string
  customerId?: string
  customer?: string
  productId?: string
  productCode?: string
  productName?: string
  processSegment?: string
  plannedQuantity?: number
  completedQuantity?: number
  planStatus?: string
  confirmStatus?: string
  materialCompleteness?: number
  responsiblePerson?: string
  remark?: string
}

export interface MaintenanceFrontParameter {
  id: string
  customerId?: string
  customer?: string
  productId: string
  productCode?: string
  productVersion?: string
  wireLength?: string
  strippingLength?: string
  terminalModel?: string
  pullForceStandard?: string
  crimpHeight?: string
  drawingVersion?: string
  parameterStatus?: string
  status?: string
  remark?: string
}

export interface MaintenanceBackPackage {
  id: string
  customerId?: string
  customer?: string
  productId: string
  productCode?: string
  productVersion?: string
  connectorModel?: string
  assemblyManual?: string
  pinMap?: string
  sop?: string
  finishedImageCount?: number
  drawingVersion?: string
  sopVersion?: string
  materialStatus?: string
  status?: string
  remark?: string
}

export interface MaintenanceDocument {
  id: string
  title: string
  customerId?: string
  customer?: string
  productId?: string
  productCode?: string
  documentType?: DocumentTypeV03
  version?: string
  status?: DocumentStatus | string
  statusLabel?: string
  source?: DocumentSource
  requiredForProcess?: RequiredProcess
  fileHealth?: string
  updatedAt?: string
  remark?: string
  raw?: ProductDocument
}

export interface MaintenanceReviewItem {
  id: string
  type: string
  customer?: string
  product?: string
  planId?: string
  entityType: MaintenanceEntityType
  entityId: string
  message: string
  recommendedAction: string
  createdAt?: string
}

export interface MaintenanceRecord {
  maintenanceId: string
  entityType: MaintenanceEntityType
  entityId: string
  action: string
  before?: unknown
  after?: unknown
  reason?: string
  operatorId: string
  operatorName: string
  operatorRole: string
  createdAt: string
}

export interface MaintenanceMutationResult {
  success?: boolean
  message?: string
  record?: MaintenanceRecord
  total?: number
  records?: MaintenanceRecord[]
}

export type KnowledgeProcessSegment = 'front' | 'back' | 'common'
export type KnowledgeStatus = 'active' | 'pending_review' | 'inactive' | 'abnormal'
export type AbnormalSeverity = 'low' | 'medium' | 'high' | 'critical'
export type AbnormalStatus = 'active' | 'pending_review' | 'closed'
export type QualityDefectLevel = 'minor' | 'major' | 'critical'
export type QualityStatus = 'effective' | 'pending_review' | 'expired'
export type KnowledgeRecordEntityType = 'fixture' | 'abnormal_case' | 'quality_standard'

export interface KnowledgeBaseItem {
  customerId: string
  customerName: string
  productId: string
  productCode: string
  productName: string
  processSegment: KnowledgeProcessSegment
  relatedDocumentIds: string[]
  keywords: string[]
  remark?: string
  createdAt: string
  updatedAt: string
}

export interface FixtureKnowledge extends KnowledgeBaseItem {
  fixtureId: string
  fixtureCode: string
  fixtureName: string
  fixtureType: string
  applicableStation: string
  usageMethod: string
  checkStandard: string
  maintenanceCycle: string
  lastMaintenanceDate: string
  nextMaintenanceDate: string
  status: KnowledgeStatus
  images?: string[]
}

export interface AbnormalCaseKnowledge extends KnowledgeBaseItem {
  abnormalId: string
  abnormalCode: string
  title: string
  station: string
  category: string
  symptom: string
  cause: string
  solution: string
  prevention: string
  severity: AbnormalSeverity
  status: AbnormalStatus
  relatedFixtureIds: string[]
}

export interface QualityStandardKnowledge extends KnowledgeBaseItem {
  qualityId: string
  qualityCode: string
  title: string
  inspectionItem: string
  standardValue: string
  tolerance: string
  inspectionMethod: string
  samplingRule: string
  defectLevel: QualityDefectLevel
  status: QualityStatus
}

export interface KnowledgeSummary {
  planId?: string
  productId: string
  productCode: string
  productName: string
  fixtures: FixtureKnowledge[]
  abnormalCases: AbnormalCaseKnowledge[]
  qualityStandards: QualityStandardKnowledge[]
  updatedAt: string
}

export interface KnowledgeSearchResult {
  id: string
  planId?: string
  productId: string
  productCode: string
  productName: string
  type: 'fixture' | 'abnormal_case' | 'quality_standard'
  title: string
  subtitle: string
  matchedField: string
  snippet: string
  status: string
}

export interface KnowledgeRecord {
  recordId: string
  entityType: KnowledgeRecordEntityType
  entityId: string
  action: string
  before?: unknown
  after?: unknown
  reason?: string
  operatorId: string
  operatorName: string
  operatorRole: string
  createdAt: string
}
