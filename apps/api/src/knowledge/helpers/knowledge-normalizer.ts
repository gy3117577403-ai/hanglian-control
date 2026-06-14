import { createHash } from 'node:crypto';
import type { KnowledgeProcessSegment } from '../knowledge.types';

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function hashId(input: string) {
  return createHash('sha1').update(input).digest('hex').slice(0, 12).toUpperCase();
}

export function includesKeyword(values: unknown[], keyword?: string) {
  const normalized = String(keyword ?? '').trim().toLowerCase();
  if (!normalized) return true;
  return values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value) => value !== undefined && value !== null)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

export function normalizeProcessSegment(value?: string): KnowledgeProcessSegment {
  if (value === 'front' || value === '前段') return 'front';
  if (value === 'back' || value === '后段') return 'back';
  return 'common';
}

export function processSegmentLabel(value?: string) {
  if (value === 'front') return '前段';
  if (value === 'back') return '后段';
  return '通用';
}

export function normalizeStringArray(value?: string[] | string) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (!value) return [];
  return String(value).split(/[,，;；\n]/).map((item) => item.trim()).filter(Boolean);
}

export function limitRows<T>(rows: T[], limit?: string | number) {
  const parsed = Number(limit ?? 200);
  const safeLimit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 500) : 200;
  return rows.slice(0, safeLimit);
}

