import type { ImportPreviewRow, ImportRowStatus } from '../../common/types/production.types';

export type RawImportRow = Record<string, string | number>;

export interface ParsedImportRow extends ImportPreviewRow {
  normalized: Record<string, string | number>;
}

export const processSegments = ['前段', '后段', '通用'];
export const planStatuses = ['待生产', '生产中', '已完成', '异常'];
export const materialStatuses = ['当前有效', '待确认', '已失效', '不一致'];

export function value(row: RawImportRow, key: string) {
  return String(row[key] ?? '').trim();
}

export function optional(row: RawImportRow, key: string, fallback = '') {
  const current = value(row, key);
  return current || fallback;
}

export function numberValue(row: RawImportRow, key: string, fallback = 0) {
  const raw = value(row, key);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function materialStatusValue(raw: string) {
  if (!raw) return '待确认';
  if (raw === '当前有效') return '有效';
  if (raw === '已失效' || raw === '不一致') return '失效';
  return raw;
}

export function statusFromMessages(messages: string[]): ImportRowStatus {
  if (messages.some((message) => message.startsWith('错误：'))) return 'error';
  if (messages.some((message) => message.startsWith('提醒：') || message.startsWith('警告：'))) return 'warning';
  return 'valid';
}

export function buildRow(
  rowNumber: number,
  data: RawImportRow,
  normalized: Record<string, string | number>,
  messages: string[],
): ParsedImportRow {
  return {
    rowNumber,
    data,
    normalized,
    status: statusFromMessages(messages),
    messages,
  };
}

export function requireText(row: RawImportRow, key: string, messages: string[]) {
  const current = value(row, key);
  if (!current) messages.push(`错误：${key}必填。`);
  return current;
}
