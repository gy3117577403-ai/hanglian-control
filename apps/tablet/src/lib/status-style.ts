import type { DocumentTab, ProductDocument, ProductionPlan } from '@/types/production'

export function completionTone(value: number) {
  if (value >= 95) return 'good'
  if (value >= 90) return 'ok'
  if (value >= 80) return 'warn'
  return 'danger'
}

export function progressClass(value: number) {
  return `warm-progress warm-progress-${completionTone(value)}`
}

export function planStatusSeverity(status: string) {
  if (status === '已完成') return 'success'
  if (status === '生产中') return 'info'
  if (status === '异常') return 'danger'
  return 'warn'
}

export function confirmSeverity(status: string) {
  if (status === '已确认') return 'success'
  if (status === '需复核') return 'danger'
  return 'warn'
}

export function materialSeverity(status: string) {
  if (status === '有效' || status === 'effective') return 'success'
  if (status === '待确认' || status === 'pending_review') return 'warn'
  return 'danger'
}

export function readinessLabel(plan: ProductionPlan) {
  if (plan.materialCompleteness >= 95 && !plan.versionStatus?.redLine) return '资料可放行'
  if (plan.materialCompleteness >= 90) return '待组长复核'
  return '资料需复核'
}

export function documentTabLabel(tab: DocumentTab) {
  const labels: Record<DocumentTab, string> = {
    drawing: 'PDF 图纸',
    sop: 'SOP 扫描',
    'pin-map': '孔位图',
    finish: '成品细节',
  }
  return labels[tab]
}

export function documentStatusLabel(document: ProductDocument) {
  const value = document.documentStatus ?? document.status
  const labels: Record<string, string> = {
    effective: '有效',
    pending_review: '待确认',
    expired: '失效',
    missing: '缺失',
    inconsistent: '不一致',
    有效: '有效',
    待确认: '待确认',
    失效: '失效',
  }
  return labels[value] ?? String(value)
}

export function rawDocumentStatus(document: ProductDocument) {
  const value = document.documentStatus ?? document.status
  if (value === '有效') return 'effective'
  if (value === '待确认') return 'pending_review'
  if (value === '失效') return 'expired'
  return value
}

export function documentSeverity(document: ProductDocument) {
  return materialSeverity(document.documentStatus ?? document.status)
}

export function documentStatusDotClass(document: ProductDocument) {
  const value = rawDocumentStatus(document)
  if (value === 'effective') return 'bg-[#229a66]'
  if (value === 'pending_review') return 'bg-[#d79527]'
  return 'bg-[#b8422a]'
}

export function isHistoricalDocument(document?: ProductDocument | null) {
  return Boolean(document && rawDocumentStatus(document) === 'expired')
}

export function isPendingDocument(document?: ProductDocument | null) {
  return Boolean(document && rawDocumentStatus(document) === 'pending_review')
}

export function sourceLabel(source?: string) {
  const labels: Record<string, string> = {
    mock: 'Mock 资料包',
    manual_upload: '本地上传',
    wecom_disk: '企业微信微盘',
  }
  return source ? labels[source] ?? source : '资料包'
}

export function completionSummary(plan: ProductionPlan) {
  const remaining = Math.max(plan.plannedQuantity - plan.completedQuantity, 0)
  return {
    percent: Math.round((plan.completedQuantity / Math.max(plan.plannedQuantity, 1)) * 100),
    remaining,
  }
}
