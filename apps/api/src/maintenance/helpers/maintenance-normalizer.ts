import type { DocumentStatus, MaterialStatus } from '../../common/enums/production.enum';

export function normalizeMaterialStatus(status?: string): MaterialStatus {
  if (status === '当前有效' || status === '有效' || status === 'active') return '有效';
  if (status === '待确认' || status === 'pending_review') return '待确认';
  return '失效';
}

export function normalizeDocumentStatus(status?: string): DocumentStatus {
  if (status === 'effective' || status === '当前有效' || status === '有效' || status === 'active') return 'effective';
  if (status === 'pending_review' || status === '待确认') return 'pending_review';
  if (status === 'missing' || status === '文件缺失') return 'missing';
  if (status === 'inconsistent' || status === '不一致') return 'inconsistent';
  return 'expired';
}

export function statusLabel(status?: string) {
  if (status === 'active') return '启用';
  if (status === 'inactive') return '停用';
  if (status === 'pending_review') return '待复核';
  return '启用';
}

export function includesKeyword(values: unknown[], keyword?: string) {
  const normalized = String(keyword ?? '').trim().toLowerCase();
  if (!normalized) return true;
  return values.some((value) => String(value ?? '').toLowerCase().includes(normalized));
}
