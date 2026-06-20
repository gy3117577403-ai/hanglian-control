import { normalizeProductModel } from './pdf-name-parser';

export interface NormalizedApplyItemInput {
  importItemId: string;
  selected: boolean;
  confirmedProductModel?: string;
  confirmedVersion?: string;
  productName?: string;
  setAsEffective?: boolean;
}

export function cleanApplyText(value: unknown, maxLength = 120) {
  const text = String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
  return text.slice(0, maxLength);
}

export function normalizeApplyOperator(value: unknown, fallback: string) {
  return cleanApplyText(value, 60) || fallback;
}

export function normalizeApplyItemInput(value: Record<string, unknown>): NormalizedApplyItemInput {
  return {
    importItemId: cleanApplyText(value.importItemId, 120),
    selected: value.selected === undefined ? true : value.selected !== false,
    confirmedProductModel: cleanApplyText(value.confirmedProductModel, 120) || undefined,
    confirmedVersion: cleanApplyText(value.confirmedVersion, 60) || undefined,
    productName: cleanApplyText(value.productName, 120) || undefined,
    setAsEffective: value.setAsEffective === true,
  };
}

export function assertNoDuplicateApplyItems(items: NormalizedApplyItemInput[]) {
  const seen = new Set<string>();
  for (const item of items) {
    if (!item.importItemId) throw new Error('导入项目不属于当前预览批次。');
    if (seen.has(item.importItemId)) throw new Error('导入项目重复提交。');
    seen.add(item.importItemId);
  }
}

export function isValidConfirmedProductModel(value: string) {
  const normalized = normalizeProductModel(value);
  if (!normalized || normalized.length < 4) return false;
  if (!/[A-Z]/.test(normalized) || !/\d/.test(normalized)) return false;
  if (/^20\d{6}$/.test(normalized.replace(/-/g, ''))) return false;
  if (/^(REV|VER|VERSION|V)-?[A-Z0-9.]+$/.test(normalized)) return false;
  return true;
}
