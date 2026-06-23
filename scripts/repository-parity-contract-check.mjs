#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const failures = [];
const types = readFileSync('apps/api/src/persistence/persistence.types.ts', 'utf8');

for (const method of [
  'readCustomers',
  'writeCustomers',
  'readProducts',
  'writeProducts',
  'makeProductDetail',
  'readImportRecords',
  'listOrders',
  'createOrder',
  'updateOrder',
  'completeOrder',
  'restoreOrder',
  'readSettings',
  'updatePasswordHash',
  'runInTransaction',
]) {
  if (!types.includes(method)) failures.push(`Repository contract missing method: ${method}`);
}

for (const path of [
  'apps/api/src/persistence/json/json-drawing.repository.ts',
  'apps/api/src/persistence/json/json-order.repository.ts',
  'apps/api/src/persistence/json/json-delete-lock.repository.ts',
  'apps/api/src/persistence/prisma/prisma-drawing.repository.ts',
  'apps/api/src/persistence/prisma/prisma-order.repository.ts',
  'apps/api/src/persistence/prisma/prisma-delete-lock.repository.ts',
]) {
  const text = readFileSync(path, 'utf8');
  if (/DATABASE_URL|postgresql:\/\/|password=/.test(text)) failures.push(`${path} 暴露或硬编码数据库连接信息。`);
  if (path.includes('/json/') && !/store|LocalStorageService/.test(text)) failures.push(`${path} 未包装现有 JSON 实现。`);
  if (path.includes('/prisma/') && !text.includes('assertWriteAllowed')) failures.push(`${path} 未检查写入闸门。`);
}

if (!readFileSync('apps/api/src/persistence/unit-of-work.ts', 'utf8').includes('$transaction')) {
  failures.push('PostgreSQL Unit of Work 未声明 Prisma $transaction。');
}

if (failures.length) {
  console.error(failures.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log('Repository parity contract check passed.');
