import { BadRequestException } from '@nestjs/common';
import type { DictionaryGroup } from '../mock/settings-seed';

export function ensureDictionaryRequiredItems(before: DictionaryGroup, next: DictionaryGroup) {
  const nextItems = new Map(next.items.map((item) => [item.key, item]));
  const missing = before.items.filter((item) => item.required && !nextItems.has(item.key));
  if (missing.length > 0) {
    throw new BadRequestException(`系统必需字典项不允许删除：${missing.map((item) => item.label).join('、')}`);
  }
}

export function ensureRecordExists<T>(record: T | undefined, message: string): T {
  if (!record) throw new BadRequestException(message);
  return record;
}
