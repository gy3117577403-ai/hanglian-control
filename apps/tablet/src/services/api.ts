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
