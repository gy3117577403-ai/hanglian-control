export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function compactText(value: unknown, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value.trim() || fallback;
}

export function arrayFromUnknown(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) return fallback;
  return value.map((item) => String(item).trim()).filter(Boolean);
}

export function booleanFromUnknown(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') return value;
  return fallback;
}
