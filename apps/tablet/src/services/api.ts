import { ofetch } from 'ofetch'
import { getApiBaseUrl } from '@/config/api-base'
import type {
  ConfirmProductionPlanPayload,
  AuditLog,
  AuditLogQuery,
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

export const api = ofetch.create({
  baseURL: API_BASE,
  timeout: 5000,
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
