import { BadRequestException } from '@nestjs/common';

export function assertNonEmpty(value: unknown, label: string) {
  if (!String(value ?? '').trim()) {
    throw new BadRequestException(`${label}不能为空。`);
  }
}

export function assertStatus<T extends string>(value: string | undefined, allowed: readonly T[], label: string) {
  if (value !== undefined && !allowed.includes(value as T)) {
    throw new BadRequestException(`${label}不在允许范围内。`);
  }
}

