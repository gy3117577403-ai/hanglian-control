import { BadRequestException } from '@nestjs/common';

export function assertIds(ids: string[]) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new BadRequestException('请至少选择一条记录。');
  }
  if (ids.length > 50) {
    throw new BadRequestException('单次批量更新最多支持 50 条。');
  }
}

export function assertFiniteNumber(value: unknown, field: string) {
  if (value === undefined || value === null) return;
  if (!Number.isFinite(Number(value))) {
    throw new BadRequestException(`${field} 必须是数字。`);
  }
}
