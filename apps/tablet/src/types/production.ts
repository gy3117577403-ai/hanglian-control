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

export type UnifiedDocumentType =
  | 'all'
  | 'drawing'
  | 'sop'
  | 'pin_map'
  | 'finished_image'
  | 'connector'
  | 'front_parameter'
  | 'back_package'
  | 'fixture'
  | 'abnormal_case'
  | 'quality_standard'
  | 'other'

export type UnifiedItemKind =
  | 'document'
  | 'front_parameter'
  | 'back_package'
  | 'fixture'
  | 'abnormal_case'
  | 'quality_standard'

export interface UnifiedDocumentItem {
  id: string
  type: UnifiedItemKind
  unifiedType: UnifiedDocumentType | string
  title: string
  subtitle: string
  customerName?: string
  productCode?: string
  productName?: string
  productVersion?: string
  version?: string
  status?: string
  source?: string
  matchedFields: string[]
  previewAvailable: boolean
  deleted: boolean
  deletedAt?: string
  deletedBy?: string
  restoredAt?: string
  restoredBy?: string
  updatedAt?: string
  keywords?: string[]
  remark?: string
  previewUrl?: string
  downloadUrl?: string
  originalFileName?: string
  fileSize?: number
  mimeType?: string
  requiredForProcess?: RequiredProcess | string
  document?: ProductDocument
  raw?: unknown
}

export interface UnifiedSearchQuery {
  q?: string
  type?: UnifiedDocumentType | string
  customer?: string
  productCode?: string
  status?: string
  includeDeleted?: boolean
  source?: string
}

export interface UnifiedSearchResponse {
  total: number
  items: UnifiedDocumentItem[]
  generatedAt: string
}

export interface UnifiedUploadPayload {
  customerName?: string
  productCode: string
  productName: string
  productVersion?: string
  documentType: DocumentTypeV03
  title: string
  version: string
  status?: DocumentStatus
  requiredForProcess?: RequiredProcess
  keywords?: string
  remark?: string
  file: File
}

export interface UnifiedUpdatePayload {
  customerName?: string
  productCode?: string
  productName?: string
  productVersion?: string
  documentType?: DocumentTypeV03
  title?: string
  version?: string
  status?: DocumentStatus
  requiredForProcess?: RequiredProcess
  keywords?: string
  remark?: string
}

export interface DeleteLockStatus {
  enabled: boolean
  hasPassword: boolean
  locked: boolean
  lockedUntil: string | null
  failedAttempts: number
}

export interface DeleteLockSetupPayload {
  password: string
  confirmPassword: string
}

export interface DeleteLockChangePayload extends DeleteLockSetupPayload {
  oldPassword: string
  updatedBy?: string
}

export interface DeletePasswordPayload {
  password: string
  reason?: string
}

export interface PurgePayload extends DeletePasswordPayload {
  confirmText: string
}

export interface BulkDeletePayload extends DeletePasswordPayload {
  ids: string[]
}

export interface BulkRestorePayload {
  ids: string[]
  reason?: string
}

export interface BulkPurgePayload extends PurgePayload {
  ids: string[]
}

export interface BulkActionResult {
  total: number
  successCount: number
  failedCount: number
  rows: Array<{ id: string; success: boolean; message?: string; result?: unknown }>
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
  stage: 'V3.0A_SEALOS_READONLY_CHECK'
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
    imports?: number
    maintenanceRecords?: number
    knowledge?: number
    execution?: number
    analytics?: number
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
  | 'execution.view'
  | 'execution.start'
  | 'execution.pause'
  | 'execution.resume'
  | 'execution.exception_hold'
  | 'execution.complete'
  | 'execution.quantity_report'
  | 'execution.process_confirm'
  | 'execution.handover'
  | 'execution.daily_report.view'
  | 'analytics.view'
  | 'analytics.production.view'
  | 'analytics.quality.view'
  | 'analytics.document.view'
  | 'analytics.knowledge.view'
  | 'analytics.summary.copy'
  | 'system.info.view'
  | 'system.diagnostics.view'
  | 'system.demo_tools.view'
  | 'system.roadmap.view'
  | 'system.freeze_check.view'
  | 'settings.view'
  | 'settings.update'
  | 'settings.dictionary.view'
  | 'settings.dictionary.update'
  | 'settings.station.view'
  | 'settings.station.update'
  | 'settings.display.view'
  | 'settings.display.update'
  | 'settings.announcement.view'
  | 'settings.announcement.update'
  | 'settings.feedback.create'
  | 'settings.feedback.view'
  | 'settings.feedback.resolve'
  | 'settings.pilot_check.view'
  | 'settings.pilot_check.run'
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

export type StationStatus = 'active' | 'inactive'
export type SettingsFeedbackStatus = 'open' | 'processing' | 'resolved' | 'ignored'
export type PilotCheckStatus = 'pass' | 'warning' | 'fail'

export interface SystemSettings {
  systemName: string
  workshopName: string
  defaultTeam: string
  defaultRole: string
  defaultPlanScope: PlanScope
  allowWarningStart: boolean
  enableFieldMode: boolean
  enableDemoTools: boolean
  remark: string
  updatedAt: string
}

export interface DictionaryItem {
  key: string
  label: string
  required?: boolean
  enabled: boolean
  sort: number
  remark?: string
}

export interface DictionaryGroup {
  groupKey: string
  groupName: string
  description: string
  items: DictionaryItem[]
  updatedAt: string
}

export interface StationProfile {
  stationId: string
  stationName: string
  stationCode: string
  processSegment: 'front' | 'back' | 'common'
  defaultRole: string
  defaultTeam: string
  defaultPlanScope: PlanScope
  defaultTabs: string[]
  enabledQuickActions: string[]
  showKnowledgePanel: boolean
  showExecutionPanel: boolean
  showAnalyticsPanel: boolean
  fieldModeDefault: boolean
  remark: string
  status: StationStatus
  createdAt: string
  updatedAt: string
}

export interface DisplaySettings {
  fontScale: 'normal' | 'large' | 'extra_large'
  cardDensity: 'normal' | 'comfortable'
  defaultFieldMode: boolean
  showDemoBadges: boolean
  showTechnicalWarnings: boolean
  enableWarmAnimations: boolean
  defaultTheme: 'warm_3d'
  updatedAt: string
}

export interface AnnouncementRecord {
  id: string
  title: string
  content: string
  type: 'notice' | 'document_change' | 'pilot_reminder' | 'maintenance'
  severity: 'info' | 'warning' | 'critical'
  active: boolean
  pinned: boolean
  startAt?: string
  endAt?: string
  createdAt: string
  updatedAt: string
  operatorName: string
}

export interface SystemFeedbackRecord {
  id: string
  feedbackType: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  currentPage?: string
  role?: string
  userId?: string
  userName?: string
  screenshotRemark?: string
  expectedResult?: string
  actualResult?: string
  status: SettingsFeedbackStatus
  resolverName?: string
  resolvedAt?: string
  createdAt: string
  updatedAt: string
}

export interface PilotCheckItem {
  key: string
  label: string
  status: PilotCheckStatus
  message: string
  recommendedAction: string
}

export interface PilotCheckResult {
  id: string
  score: number
  status: PilotCheckStatus
  checkedAt: string
  summary: string
  items: PilotCheckItem[]
  operatorName: string
}

export interface SettingsRecord {
  id: string
  entityType: string
  entityId: string
  action: string
  before?: unknown
  after?: unknown
  operatorId: string
  operatorName: string
  operatorRole: string
  reason?: string
  createdAt: string
}

export interface SettingsSummary {
  version: 'V3.1'
  stage: string
  dataSource: 'mock'
  sealosConnected: boolean
  wecomDiskConnected: boolean
  realVoiceConnected: boolean
  systemName: string
  stationProfiles: number
  dictionaryGroups: number
  announcements: number
  openFeedback: number
  lastUpdatedAt: string
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

export type KnowledgeValidationStatus = 'ready' | 'need_review' | 'blocked'
export type KnowledgeRecommendationLevel = 'info' | 'warning' | 'danger'

export interface KnowledgeValidationCheckItem {
  key: string
  label: string
  required: boolean
  status: CheckItemStatus
  message: string
}

export interface KnowledgeValidationSummary {
  total: number
  active?: number
  pendingReview?: number
  abnormal?: number
  highRisk?: number
  critical?: number
  effective?: number
  expired?: number
}

export interface KnowledgeRecommendation {
  level: KnowledgeRecommendationLevel
  title: string
  action: string
  entityType?: KnowledgeRecordEntityType
  entityId?: string
}

export interface KnowledgeValidationResult {
  planId?: string
  productId: string
  productCode: string
  productName: string
  processSegment: KnowledgeProcessSegment
  validationStatus: KnowledgeValidationStatus
  score: number
  summary: string
  checkItems: KnowledgeValidationCheckItem[]
  fixtureSummary: KnowledgeValidationSummary
  abnormalSummary: KnowledgeValidationSummary
  qualitySummary: KnowledgeValidationSummary
  recommendations: KnowledgeRecommendation[]
  updatedAt: string
}

export interface KnowledgePlanRecommendations {
  planId: string
  productId: string
  validationStatus: KnowledgeValidationStatus
  score: number
  summary: string
  recommendations: KnowledgeRecommendation[]
  fixtures: FixtureKnowledge[]
  abnormalCases: AbnormalCaseKnowledge[]
  qualityStandards: QualityStandardKnowledge[]
  riskAlerts: KnowledgeRecommendation[]
  updatedAt: string
}

export interface KnowledgeBulkUpdatePayload {
  ids: string[]
  patch: Record<string, unknown>
  reason?: string
  operatorId?: string
  operatorName?: string
  operatorRole?: string
}

export interface KnowledgeBulkUpdateResult<T> {
  success: boolean
  updatedCount: number
  records: T[]
  summary: {
    total: number
    byStatus: Record<string, number>
    updatedAt: string
  }
}

export type ExecutionStatus =
  | 'not_started'
  | 'ready_to_start'
  | 'running'
  | 'paused'
  | 'exception_hold'
  | 'completed'
  | 'cancelled'

export type ExecutionEventType =
  | 'prepare_start'
  | 'start'
  | 'process_confirm'
  | 'quantity_report'
  | 'pause'
  | 'resume'
  | 'exception_hold'
  | 'complete'
  | 'cancel'
  | 'handover'

export type ProcessConfirmType =
  | 'front_parameter_checked'
  | 'back_document_checked'
  | 'fixture_checked'
  | 'quality_checked'
  | 'first_piece_checked'
  | 'other'

export type ProcessConfirmResult = 'pass' | 'warning' | 'fail'

export interface ExecutionRecord {
  recordId: string
  planId: string
  eventType: ExecutionEventType
  executionStatus: ExecutionStatus
  statusBefore?: ExecutionStatus
  statusAfter?: ExecutionStatus
  confirmType?: ProcessConfirmType
  result?: ProcessConfirmResult
  remark?: string
  operatorId: string
  operatorName: string
  operatorRole: string
  createdAt: string
}

export interface PlanStatusEvent {
  eventId: string
  planId: string
  eventType: ExecutionEventType
  fromStatus?: ExecutionStatus
  toStatus: ExecutionStatus
  message: string
  operatorId: string
  operatorName: string
  operatorRole: string
  createdAt: string
}

export interface QuantityReport {
  reportId: string
  planId: string
  completedQuantity: number
  defectQuantity: number
  reworkQuantity: number
  scrapQuantity: number
  cumulativeCompletedQuantity: number
  planQuantity: number
  warning?: string
  remark?: string
  operatorId: string
  operatorName: string
  operatorRole: string
  createdAt: string
}

export interface ShiftHandoverRecord {
  handoverId: string
  fromTeam: string
  toTeam: string
  planIds: string[]
  summary: string
  riskItems: string[]
  unfinishedItems: string[]
  operatorId: string
  operatorName: string
  operatorRole: string
  createdAt: string
}

export interface ExecutionTimelineItem {
  id: string
  planId: string
  eventType: ExecutionEventType
  title: string
  description: string
  status?: ExecutionStatus
  severity: 'info' | 'success' | 'warn' | 'danger'
  operatorName?: string
  createdAt: string
}

export interface StartPreparationResult {
  planId: string
  allowed: boolean
  allowWarningStart: boolean
  readiness: PlanReadiness
  knowledgeValidation: KnowledgeValidationResult
  warnings: string[]
  blockers: string[]
  recommendations: string[]
  preparedStatus: ExecutionStatus
  updatedAt: string
}

export interface ExecutionPlanListItem extends ProductionPlan {
  executionStatus: ExecutionStatus
  executionStatusLabel: string
  completionRate: number
  latestEvent?: PlanStatusEvent
  latestQuantityReport?: QuantityReport
}

export interface ExecutionPlanDetail extends ExecutionPlanListItem {
  readiness: PlanReadiness
  knowledgeValidation: KnowledgeValidationResult
  confirmations: ExecutionRecord[]
  quantityReports: QuantityReport[]
  timeline: ExecutionTimelineItem[]
  latestException?: ExecutionTimelineItem
  handoverRecords: ShiftHandoverRecord[]
}

export interface ExecutionSummary {
  todayPlans: number
  notStarted: number
  running: number
  paused: number
  exceptionHold: number
  completed: number
  completionRate: number
  exceptionCount: number
  lastUpdatedAt: string
}

export interface DailyReport {
  date: string
  team?: string
  processSegment?: string
  planCount: number
  plannedQuantity: number
  completedQuantity: number
  defectQuantity: number
  reworkQuantity: number
  scrapQuantity: number
  runningPlans: number
  completedPlans: number
  exceptionHoldPlans: number
  majorExceptions: string[]
  pendingReviewItems: string[]
  handovers: ShiftHandoverRecord[]
  generatedAt: string
}

export interface StartPlanPayload {
  operatorId?: string
  operatorName?: string
  operatorRole?: string
  remark?: string
  allowWarningStart?: boolean
}

export interface ProcessConfirmationPayload {
  confirmType: ProcessConfirmType
  result: ProcessConfirmResult
  remark?: string
  operatorId?: string
  operatorName?: string
  operatorRole?: string
}

export interface QuantityReportPayload {
  completedQuantity: number
  defectQuantity?: number
  reworkQuantity?: number
  scrapQuantity?: number
  remark?: string
  operatorId?: string
  operatorName?: string
  operatorRole?: string
}

export interface ExecutionReasonPayload {
  reason?: string
  feedbackId?: string
  operatorId?: string
  operatorName?: string
  operatorRole?: string
}

export interface CompletePlanPayload {
  finalCompletedQuantity: number
  finalDefectQuantity?: number
  remark?: string
  operatorId?: string
  operatorName?: string
  operatorRole?: string
}

export interface ShiftHandoverPayload {
  fromTeam: string
  toTeam: string
  planIds: string[]
  summary: string
  riskItems?: string[]
  unfinishedItems?: string[]
  operatorId?: string
  operatorName?: string
  operatorRole?: string
}

export type AnalyticsRange = 'today' | 'week' | 'month' | 'all'
export type AnalyticsProcessSegment = 'front' | 'back' | 'common' | 'all'

export interface AnalyticsQuery {
  range?: AnalyticsRange
  dateFrom?: string
  dateTo?: string
  team?: string
  processSegment?: AnalyticsProcessSegment
  customerId?: string
  productId?: string
  role?: string
}

export interface AnalyticsChartPoint {
  name: string
  value: number
}

export interface AnalyticsTrendPoint {
  date: string
  completionRate: number
  defectRate: number
  exceptionCount: number
  pendingReviewDocuments: number
  missingFiles: number
  pendingKnowledge: number
}

export interface AnalyticsRankingItem {
  rank: number
  customer?: string
  productCode?: string
  productName?: string
  category?: string
  count: number
  action: string
}

export interface AnalyticsOverview {
  range: AnalyticsRange
  filters: AnalyticsQuery
  production: {
    planCount: number
    running: number
    completed: number
    paused: number
    exceptionHold: number
    completionRate: number
  }
  quantity: {
    plannedQuantity: number
    completedQuantity: number
    defectQuantity: number
    reworkQuantity: number
    scrapQuantity: number
    defectRate: number
  }
  documents: {
    total: number
    effective: number
    pendingReview: number
    expired: number
    missingFile: number
    duplicateVersion?: number
  }
  knowledge: {
    fixtures: number
    abnormalCases: number
    qualityStandards: number
    pendingReview: number
  }
  risk: {
    blockedPlans: number
    needReviewPlans: number
    criticalAbnormal: number
    highSeverityAbnormal: number
  }
  generatedAt: string
  dataSource: 'mock-metadata'
}

export interface AnalyticsProduction {
  statusDistribution: AnalyticsChartPoint[]
  processDistribution: AnalyticsChartPoint[]
  teamDistribution: AnalyticsChartPoint[]
  completionRate: number
  activePlans: ExecutionPlanListItem[]
}

export interface AnalyticsQuantity {
  plannedQuantity: number
  completedQuantity: number
  defectQuantity: number
  reworkQuantity: number
  scrapQuantity: number
  defectRate: number
  completionRate: number
  trends: AnalyticsTrendPoint[]
}

export interface AnalyticsExceptions {
  feedbackCount: number
  exceptionHoldCount: number
  categoryRanking: AnalyticsChartPoint[]
  seriousItems: Array<{ title: string; productCode: string; severity: string; action: string }>
  statusDistribution: AnalyticsChartPoint[]
  trends: AnalyticsTrendPoint[]
}

export interface AnalyticsDocuments {
  summary: AnalyticsOverview['documents']
  issueRanking: AnalyticsRankingItem[]
  issueItems: ProductDocument[]
}

export interface AnalyticsKnowledge {
  summary: AnalyticsOverview['knowledge']
  fixtureStatus: AnalyticsChartPoint[]
  abnormalSeverity: AnalyticsChartPoint[]
  qualityStatus: AnalyticsChartPoint[]
  pendingReviewItems: Array<{ title: string; productCode: string; type: string; action: string }>
  highRiskAbnormalRanking: AnalyticsChartPoint[]
}

export interface AnalyticsTrends {
  filters: AnalyticsQuery
  rows: AnalyticsTrendPoint[]
  generatedAt: string
}

export interface AnalyticsRankings {
  documentIssueProducts: AnalyticsRankingItem[]
  exceptionProducts: AnalyticsRankingItem[]
  pendingReviewProducts: AnalyticsRankingItem[]
  missingFileProducts: AnalyticsRankingItem[]
  highRiskAbnormalCategories: AnalyticsRankingItem[]
}

export type SystemQaStatus = 'pass' | 'warning' | 'fail'

export interface SystemQaCheckItem {
  key: string
  label: string
  status: SystemQaStatus
  message: string
  module?: string
  detail?: string
}

export interface SystemQaSummary {
  pass: number
  warning: number
  fail: number
}

export interface SystemQaListReport {
  valid: boolean
  score: number
  errors: SystemQaCheckItem[]
  warnings: SystemQaCheckItem[]
  items: SystemQaCheckItem[]
  generatedAt: string
}

export interface SystemQaOverview {
  version: 'V2.7'
  dataSource: 'mock'
  databaseConnected: false
  wecomConnected: false
  wecomLoginConnected: false
  realVoiceConnected: false
  modules: Record<string, 'ok' | 'warning' | 'fail'>
  summary: SystemQaSummary
  generatedAt: string
}

export interface SystemQaPermissionRoleReport {
  role: MockRole
  roleLabel: string
  visibleMenus: string[]
  allowedActions: string[]
  shouldBlockActions: string[]
  missingWarnings: string[]
  overGrantedWarnings: string[]
  status: SystemQaStatus
}

export interface SystemQaPermissionRegression {
  valid: boolean
  score: number
  roles: SystemQaPermissionRoleReport[]
  warnings: SystemQaCheckItem[]
  errors: SystemQaCheckItem[]
  generatedAt: string
}

export interface SystemQaAcceptanceReport {
  version: 'V2.7'
  releaseName: string
  generatedAt: string
  overview: {
    dataSource: 'mock'
    databaseConnected: false
    wecomConnected: false
    wecomLoginConnected: false
    realVoiceConnected: false
  }
  modules: Record<string, 'ok' | 'warning' | 'fail'>
  checks: {
    dataConsistency: SystemQaListReport
    businessFlow: SystemQaListReport
    permissionRegression: SystemQaPermissionRegression
    demoReadiness: SystemQaListReport
  }
  completedModules: string[]
  notConnected: string[]
  recommendedCommands: string[]
  nextRoutes: string[]
}

export type HubMode = 'drawing' | 'connector' | 'fixture'
export type HubOrderScope = 'today' | 'week' | 'all'
export type HubOrderStatus = 'front' | 'back' | 'no_drawing' | 'exception'
export type DrawingStatus = 'available' | 'no_drawing' | 'partial'
export type DrawingModuleStatus = 'uploaded' | 'pending' | 'no_drawing'
export type DrawingModuleKey = 'original_drawing' | 'sop' | 'finished_images' | 'accessory_specs' | 'notes' | 'tooling'
export type DrawingViewLevel = 'customers' | 'products' | 'product' | 'module' | 'image'

export interface HubOrder {
  orderId: string
  scope: 'today' | 'week'
  productId?: string
  productModel: string
  customerName: string
  quantity?: number
  plannedQuantity?: number
  planQuantity?: number
  planQty?: number
  status: HubOrderStatus
  completed: boolean
  completedAt?: string
  remark?: string
}

export interface HubOrderOverview {
  weekOrders: HubOrder[]
  pendingOrders: HubOrder[]
  completedOrders: HubOrder[]
  summary: {
    weekTotal: number
    pendingTotal: number
    completedTotal: number
  }
}

export interface HubCustomer {
  customerId: string
  customerName: string
  customerShortName: string
}

export interface HubProductModel {
  productId: string
  customerId: string
  productModel: string
  productName: string
  drawingStatus: DrawingStatus
  remark?: string
}

export interface DrawingItem {
  itemId: string
  title: string
  fileType: 'pdf' | 'image' | 'text' | 'card'
  previewUrl?: string
  fileName?: string
  version: string
  remark?: string
  uploadedAt: string
  source: 'mock' | 'manual_upload' | 'wecom_disk_future'
}

export interface DrawingModule {
  moduleKey: DrawingModuleKey
  moduleName: string
  status: DrawingModuleStatus
  items: DrawingItem[]
  remark?: string
  updatedAt: string
}

export interface ProductDrawingDetail {
  product: HubProductModel
  customer?: HubCustomer
  modules: DrawingModule[]
}

export interface ConnectorParameter {
  connectorId: string
  connectorModel: string
  specification?: string
  insertionLengthMm: number
  outerStripLengthMm: number
  innerStripLengthMm: number
  remark?: string
  status?: string
  terminalModel?: string
  pinCount?: number
  color?: string
  wireRange?: string
  manufacturer?: string
  lockType?: string
  processSegment?: string
}

export interface ConnectorParameterPayload {
  connectorModel: string
  specification?: string
  insertionLengthMm: number
  outerStripLengthMm: number
  innerStripLengthMm: number
  remark?: string
  status?: string
}

export interface ConnectorImportRowResult {
  rowNumber: number
  connectorModel: string
  specification?: string
  action: 'created' | 'updated' | 'skipped' | 'conflict' | 'error'
  valid: boolean
  message: string
  resolution?: string
  issues?: Array<{
    field: string
    message: string
    resolution: string
  }>
}

export interface ConnectorImportResult {
  requiresOverwrite?: boolean
  requiresDecision?: boolean
  duplicateStrategy?: 'review' | 'skip' | 'overwrite'
  totalRows: number
  validRows?: number
  importedRows: number
  createdRows: number
  updatedRows: number
  skippedRows: number
  errorRows?: number
  duplicateRows?: ConnectorImportRowResult[]
  rows: ConnectorImportRowResult[]
  connectors: ConnectorParameter[]
}

export interface FixtureParameter {
  fixtureId: string
  fixtureCode: string
  fixtureName: string
  fixtureType: string
  applicableProduct: string
  station: string
  processSegment: string
  storageLocation: string
  status: string
  maintenanceCycle: string
  remark?: string
}

export interface DocumentHubUploadPayload {
  customerId?: string
  productId?: string
  moduleKey?: DrawingModuleKey
  title: string
  version: string
  remark?: string
  keywords?: string
  file?: File | null
}

export interface DocumentHubUploadResponse {
  success: boolean
  item: DrawingItem
  module: DrawingModule
  product: HubProductModel
  detail?: ProductDrawingDetail
}

export interface DocumentHubDeleteResponse {
  success: boolean
  deletedItemId: string
  fileResult?: {
    deleted: boolean
    reason: string
  }
  module?: DrawingModule
  product: HubProductModel
  detail?: ProductDrawingDetail
  reason?: string
}
