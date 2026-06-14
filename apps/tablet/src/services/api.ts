import { ofetch } from 'ofetch'
import { getApiBaseUrl } from '@/config/api-base'
import type {
  ConfirmProductionPlanPayload,
  AuditLog,
  AuditLogQuery,
  AuthSession,
  DatabaseSafetyStatus,
  DataSourceStatus,
  DocumentCompareResult,
  DocumentFileHealthQuery,
  DocumentFileHealthResponse,
  DocumentQuery,
  DocumentVersionGroup,
  DocumentVersionQuery,
  DocumentVersionsResponse,
  FeedbackRecord,
  HealthResponse,
  ImportApplyPayload,
  ImportApplyResult,
  ImportPreviewResult,
  ImportRecord,
  ImportRollbackPreview,
  ImportTemplateDefinition,
  ImportType,
  AbnormalCaseKnowledge,
  AbnormalStatus,
  FixtureKnowledge,
  KnowledgeProcessSegment,
  KnowledgeRecord,
  KnowledgeBulkUpdatePayload,
  KnowledgeBulkUpdateResult,
  KnowledgePlanRecommendations,
  KnowledgeSearchResult,
  KnowledgeStatus,
  KnowledgeSummary,
  KnowledgeValidationResult,
  QualityStandardKnowledge,
  QualityStatus,
  MaintenanceBackPackage,
  MaintenanceCustomer,
  MaintenanceDocument,
  MaintenanceEntityType,
  MaintenanceFrontParameter,
  MaintenanceMutationResult,
  MaintenanceProduct,
  MaintenanceProductionPlan,
  MaintenanceQuery,
  MaintenanceRecord,
  MaintenanceReviewItem,
  MaintenanceSummary,
  MigrationPreview,
  MigrationValidation,
  MockUser,
  PermissionMatrixResponse,
  PlanReadiness,
  PlanScope,
  PrismaSeedPreview,
  ProductionPlan,
  ProductDocument,
  SearchHit,
  SetEffectiveDocumentPayload,
  SetEffectiveDocumentResult,
  SubmitFeedbackPayload,
  UpdateDocumentStatusPayload,
  UpdateDocumentVersionPayload,
} from '@/types/production'

const API_BASE = getApiBaseUrl()

const AUTH_STORAGE_KEYS = {
  token: 'hanglian.auth.token',
  currentUser: 'hanglian.auth.currentUser',
}

function readAuthHeaders(): Record<string, string> {
  if (typeof localStorage === 'undefined') return {}
  const token = localStorage.getItem(AUTH_STORAGE_KEYS.token)
  const currentUserRaw = localStorage.getItem(AUTH_STORAGE_KEYS.currentUser)
  let currentUser: Pick<MockUser, 'userId'> | null = null
  try {
    currentUser = currentUserRaw ? JSON.parse(currentUserRaw) as MockUser : null
  } catch {
    currentUser = null
  }
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(currentUser?.userId ? { 'x-mock-user-id': currentUser.userId } : {}),
  }
}

export const api = ofetch.create({
  baseURL: API_BASE,
  timeout: 5000,
  onRequest({ options }) {
    const headers = new Headers(options.headers as HeadersInit | undefined)
    for (const [key, value] of Object.entries(readAuthHeaders())) {
      headers.set(key, value)
    }
    options.headers = headers
  },
})

export const apiBaseUrl = API_BASE

export function pingApi() {
  return api<{ ok: boolean; timestamp: string; service: string }>('/system/ping')
}

export async function measureApiLatency() {
  const startedAt = Date.now()
  try {
    const response = await pingApi()
    return {
      ok: response.ok,
      latencyMs: Date.now() - startedAt,
      checkedAt: response.timestamp,
    }
  } catch {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    }
  }
}

export async function checkFileService(query?: DocumentFileHealthQuery) {
  const startedAt = Date.now()
  try {
    await api<DocumentFileHealthResponse>('/documents/file-health', { query })
    return {
      ok: true,
      latencyMs: Date.now() - startedAt,
      message: '文件健康接口正常',
    }
  } catch {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      message: '文件健康接口异常',
    }
  }
}

export function getHealth() {
  return api<HealthResponse>('/health')
}

export function getDataSourceStatus() {
  return api<DataSourceStatus>('/system/data-source')
}

export function getDatabaseSafety() {
  return api<DatabaseSafetyStatus>('/system/database-safety')
}

export function getMockUsers() {
  return api<MockUser[]>('/auth/mock-users')
}

export function mockLogin(userId: string) {
  return api<AuthSession>('/auth/mock-login', {
    method: 'POST',
    body: { userId },
  })
}

export function getCurrentAuthUser() {
  return api<AuthSession>('/auth/me')
}

export function logoutMockUser() {
  return api<{ success: boolean; message: string }>('/auth/logout', {
    method: 'POST',
  })
}

export function getPermissionMatrix() {
  return api<PermissionMatrixResponse>('/auth/permissions')
}

export function getProductionPlans(scope: PlanScope) {
  return api<ProductionPlan[]>('/production-plans', {
    query: { scope },
  })
}

export function getProductionPlanDetail(id: string) {
  return api<ProductionPlan>(`/production-plans/${id}`)
}

export function getPlanReadiness(id: string) {
  return api<PlanReadiness>(`/production-plans/${id}/readiness`)
}

export function confirmProductionPlan(id: string, payload: ConfirmProductionPlanPayload) {
  return api<ProductionPlan>(`/production-plans/${id}/confirm`, {
    method: 'POST',
    body: payload,
  })
}

export function searchDocuments(query: string, planId?: string) {
  return api<SearchHit[]>('/search', {
    query: {
      q: query,
      ...(planId ? { planId } : {}),
    },
  })
}

export function submitFeedback(payload: SubmitFeedbackPayload) {
  return api<{ success: boolean; message: string; record: FeedbackRecord }>('/feedback', {
    method: 'POST',
    body: payload,
  })
}

export function getFeedback(planId?: string) {
  return api<FeedbackRecord[]>('/feedback', {
    query: planId ? { planId } : undefined,
  })
}

export function getDocuments(query?: DocumentQuery) {
  return api<ProductDocument[]>('/documents', {
    query,
  })
}

export function getDocumentFileHealth(query?: DocumentFileHealthQuery) {
  return api<DocumentFileHealthResponse>('/documents/file-health', {
    query,
  })
}

export function uploadDocument(formData: FormData) {
  return api<ProductDocument>('/documents/upload', {
    method: 'POST',
    body: formData,
  })
}

export function getDocumentDetail(id: string) {
  return api<ProductDocument>(`/documents/${id}`)
}

export function getDocumentVersions(id: string) {
  return api<DocumentVersionsResponse>(`/documents/${id}/versions`)
}

export function getProductDocumentVersions(query: DocumentVersionQuery) {
  return api<DocumentVersionGroup[]>('/documents/versions', {
    query,
  })
}

export function setDocumentEffective(id: string, payload: SetEffectiveDocumentPayload) {
  return api<SetEffectiveDocumentResult>(`/documents/${id}/set-effective`, {
    method: 'POST',
    body: payload,
  })
}

export function compareDocuments(payload: { documentIds: string[] }) {
  return api<DocumentCompareResult>('/documents/compare', {
    method: 'POST',
    body: payload,
  })
}

export function updateDocumentStatus(id: string, payload: UpdateDocumentStatusPayload) {
  return api<ProductDocument>(`/documents/${id}/status`, {
    method: 'PATCH',
    body: payload,
  })
}

export function updateDocumentVersion(id: string, payload: UpdateDocumentVersionPayload) {
  return api<ProductDocument>(`/documents/${id}/version`, {
    method: 'PATCH',
    body: payload,
  })
}

export function archiveDocument(id: string) {
  return api<ProductDocument>(`/documents/${id}/archive`, {
    method: 'POST',
  })
}

export function getAuditLogs(query?: AuditLogQuery) {
  return api<AuditLog[]>('/audit-logs', {
    query,
  })
}

export function getMigrationPreview() {
  return api<MigrationPreview>('/migration/preview')
}

export function validateMigration() {
  return api<MigrationValidation>('/migration/validate')
}

export function getPrismaSeedPreview() {
  return api<PrismaSeedPreview>('/migration/prisma-seed-preview')
}

export function exportMigrationSeed() {
  return api('/migration/export-seed')
}

export function getImportTemplates() {
  return api<ImportTemplateDefinition[]>('/imports/templates')
}

export async function downloadImportTemplate(type: ImportType) {
  const response = await fetch(`${apiBaseUrl}/imports/templates/${type}/download`)
  if (!response.ok) throw new Error('模板下载失败')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${type}-template.xlsx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function previewImport(type: ImportType, formData: FormData) {
  return api<ImportPreviewResult>(`/imports/${type}/preview`, {
    method: 'POST',
    body: formData,
    timeout: 15000,
  })
}

export function applyImport(type: ImportType, payload: ImportApplyPayload) {
  return api<ImportApplyResult>(`/imports/${type}/apply`, {
    method: 'POST',
    body: payload,
    timeout: 15000,
  })
}

export function getImportHistory() {
  return api<ImportRecord[]>('/imports/history')
}

export function getImportHistoryDetail(id: string) {
  return api<ImportRecord>(`/imports/history/${id}`)
}

export function previewImportRollback(id: string) {
  return api<ImportRollbackPreview>(`/imports/history/${id}/rollback-preview`, {
    method: 'POST',
  })
}

export function getMaintenanceSummary() {
  return api<MaintenanceSummary>('/maintenance/summary')
}

export function getMaintenanceCustomers(query?: MaintenanceQuery) {
  return api<MaintenanceCustomer[]>('/maintenance/customers', { query })
}

export function updateMaintenanceCustomer(id: string, payload: Record<string, unknown>) {
  return api<MaintenanceRecord>(`/maintenance/customers/${id}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function getMaintenanceProducts(query?: MaintenanceQuery) {
  return api<MaintenanceProduct[]>('/maintenance/products', { query })
}

export function updateMaintenanceProduct(id: string, payload: Record<string, unknown>) {
  return api<MaintenanceRecord>(`/maintenance/products/${id}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function getMaintenanceProductionPlans(query?: MaintenanceQuery) {
  return api<MaintenanceProductionPlan[]>('/maintenance/production-plans', { query })
}

export function updateMaintenanceProductionPlan(id: string, payload: Record<string, unknown>) {
  return api<MaintenanceRecord>(`/maintenance/production-plans/${id}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function getMaintenanceFrontParameters(query?: MaintenanceQuery) {
  return api<MaintenanceFrontParameter[]>('/maintenance/front-parameters', { query })
}

export function updateMaintenanceFrontParameter(id: string, payload: Record<string, unknown>) {
  return api<MaintenanceRecord>(`/maintenance/front-parameters/${id}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function getMaintenanceBackPackages(query?: MaintenanceQuery) {
  return api<MaintenanceBackPackage[]>('/maintenance/back-packages', { query })
}

export function updateMaintenanceBackPackage(id: string, payload: Record<string, unknown>) {
  return api<MaintenanceRecord>(`/maintenance/back-packages/${id}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function getMaintenanceDocuments(query?: MaintenanceQuery) {
  return api<MaintenanceDocument[]>('/maintenance/documents', { query })
}

export function updateMaintenanceDocument(id: string, payload: Record<string, unknown>) {
  return api<MaintenanceRecord>(`/maintenance/documents/${id}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function setMaintenanceDocumentEffective(id: string, payload: { reason?: string }) {
  return api<MaintenanceRecord>(`/maintenance/documents/${id}/set-effective`, {
    method: 'POST',
    body: payload,
  })
}

export function bulkUpdateMaintenanceStatus(payload: { entityType: MaintenanceEntityType; ids: string[]; status: string; reason?: string }) {
  return api<MaintenanceMutationResult>('/maintenance/bulk-status', {
    method: 'POST',
    body: payload,
  })
}

export function getMaintenanceReviewQueue(query?: MaintenanceQuery) {
  return api<MaintenanceReviewItem[]>('/maintenance/review-queue', { query })
}

export function resolveMaintenanceReviewItem(id: string, payload: { action: 'mark_reviewed' | 'mark_pending' | 'mark_inconsistent'; remark?: string }) {
  return api<MaintenanceMutationResult | MaintenanceRecord>(`/maintenance/review-queue/${encodeURIComponent(id)}/resolve`, {
    method: 'POST',
    body: payload,
  })
}

export function getMaintenanceHistory(query?: MaintenanceQuery) {
  return api<MaintenanceRecord[]>('/maintenance/history', { query })
}

export function getMaintenanceHistoryDetail(id: string) {
  return api<MaintenanceRecord>(`/maintenance/history/${id}`)
}

export interface KnowledgeQuery {
  keyword?: string
  customerId?: string
  productId?: string
  processSegment?: KnowledgeProcessSegment
  status?: string
  limit?: string | number
}

export function getFixtures(query?: KnowledgeQuery) {
  return api<FixtureKnowledge[]>('/knowledge/fixtures', { query })
}

export function createFixture(payload: Partial<FixtureKnowledge>) {
  return api<FixtureKnowledge>('/knowledge/fixtures', {
    method: 'POST',
    body: payload,
  })
}

export function updateFixture(id: string, payload: Partial<FixtureKnowledge>) {
  return api<FixtureKnowledge>(`/knowledge/fixtures/${id}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function updateFixtureStatus(id: string, status: KnowledgeStatus, reason?: string) {
  return api<FixtureKnowledge>(`/knowledge/fixtures/${id}/status`, {
    method: 'PATCH',
    body: { status, reason },
  })
}

export function bulkUpdateFixtures(payload: KnowledgeBulkUpdatePayload) {
  return api<KnowledgeBulkUpdateResult<FixtureKnowledge>>('/knowledge/fixtures/bulk-update', {
    method: 'POST',
    body: payload,
  })
}

export function getAbnormalCases(query?: KnowledgeQuery & { severity?: string }) {
  return api<AbnormalCaseKnowledge[]>('/knowledge/abnormal-cases', { query })
}

export function createAbnormalCase(payload: Partial<AbnormalCaseKnowledge>) {
  return api<AbnormalCaseKnowledge>('/knowledge/abnormal-cases', {
    method: 'POST',
    body: payload,
  })
}

export function updateAbnormalCase(id: string, payload: Partial<AbnormalCaseKnowledge>) {
  return api<AbnormalCaseKnowledge>(`/knowledge/abnormal-cases/${id}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function updateAbnormalStatus(id: string, status: AbnormalStatus, reason?: string) {
  return api<AbnormalCaseKnowledge>(`/knowledge/abnormal-cases/${id}/status`, {
    method: 'PATCH',
    body: { status, reason },
  })
}

export function bulkUpdateAbnormalCases(payload: KnowledgeBulkUpdatePayload) {
  return api<KnowledgeBulkUpdateResult<AbnormalCaseKnowledge>>('/knowledge/abnormal-cases/bulk-update', {
    method: 'POST',
    body: payload,
  })
}

export function getQualityStandards(query?: KnowledgeQuery & { defectLevel?: string }) {
  return api<QualityStandardKnowledge[]>('/knowledge/quality-standards', { query })
}

export function createQualityStandard(payload: Partial<QualityStandardKnowledge>) {
  return api<QualityStandardKnowledge>('/knowledge/quality-standards', {
    method: 'POST',
    body: payload,
  })
}

export function updateQualityStandard(id: string, payload: Partial<QualityStandardKnowledge>) {
  return api<QualityStandardKnowledge>(`/knowledge/quality-standards/${id}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function updateQualityStatus(id: string, status: QualityStatus, reason?: string) {
  return api<QualityStandardKnowledge>(`/knowledge/quality-standards/${id}/status`, {
    method: 'PATCH',
    body: { status, reason },
  })
}

export function bulkUpdateQualityStandards(payload: KnowledgeBulkUpdatePayload) {
  return api<KnowledgeBulkUpdateResult<QualityStandardKnowledge>>('/knowledge/quality-standards/bulk-update', {
    method: 'POST',
    body: payload,
  })
}

export function getProductKnowledgeSummary(productId: string, processSegment?: KnowledgeProcessSegment) {
  return api<KnowledgeSummary>(`/knowledge/product/${productId}/summary`, {
    query: processSegment ? { processSegment } : undefined,
  })
}

export function getPlanKnowledgeSummary(planId: string, processSegment?: KnowledgeProcessSegment) {
  return api<KnowledgeSummary>(`/knowledge/plan/${planId}/summary`, {
    query: processSegment ? { processSegment } : undefined,
  })
}

export function getPlanKnowledgeValidation(planId: string) {
  return api<KnowledgeValidationResult>(`/knowledge/plan/${planId}/validation`)
}

export function getProductKnowledgeValidation(productId: string, processSegment?: KnowledgeProcessSegment) {
  return api<KnowledgeValidationResult>(`/knowledge/product/${productId}/validation`, {
    query: processSegment ? { processSegment } : undefined,
  })
}

export function getPlanKnowledgeRecommendations(planId: string) {
  return api<KnowledgePlanRecommendations>(`/knowledge/plan/${planId}/recommendations`)
}

export function searchKnowledge(q: string, planId?: string, productId?: string) {
  return api<KnowledgeSearchResult[]>('/knowledge/search', {
    query: {
      q,
      ...(planId ? { planId } : {}),
      ...(productId ? { productId } : {}),
    },
  })
}

export function getKnowledgeHistory(query?: { entityType?: string; entityId?: string; operatorId?: string; keyword?: string; limit?: string | number }) {
  return api<KnowledgeRecord[]>('/knowledge/history', { query })
}
