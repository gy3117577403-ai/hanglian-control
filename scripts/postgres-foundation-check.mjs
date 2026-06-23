#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`缺少文件：${path}`);
    return '';
  }
  return readFileSync(path, 'utf8');
}

function requireIncludes(path, needle, message) {
  const text = read(path);
  if (!text.includes(needle)) failures.push(message);
}

function requireNotIncludes(path, needle, message) {
  const text = read(path);
  if (text.includes(needle)) failures.push(message);
}

[
  'apps/api/src/persistence/persistence.tokens.ts',
  'apps/api/src/persistence/persistence.types.ts',
  'apps/api/src/persistence/persistence.module.ts',
  'apps/api/src/persistence/unit-of-work.ts',
  'apps/api/src/persistence/json/json-drawing.repository.ts',
  'apps/api/src/persistence/json/json-order.repository.ts',
  'apps/api/src/persistence/json/json-delete-lock.repository.ts',
  'apps/api/src/persistence/prisma/prisma-drawing.repository.ts',
  'apps/api/src/persistence/prisma/prisma-order.repository.ts',
  'apps/api/src/persistence/prisma/prisma-delete-lock.repository.ts',
  'apps/api/src/database/database-config.service.ts',
  'scripts/json-migration-plan.mjs',
  'scripts/json-migration-dry-run.mjs',
  'scripts/postgres-parity-check.mjs',
].forEach(read);

for (const token of [
  'DRAWING_REPOSITORY',
  'DOCUMENT_REPOSITORY',
  'ORDER_REPOSITORY',
  'AUDIT_REPOSITORY',
  'DELETE_LOCK_REPOSITORY',
  'PERSISTENCE_UNIT_OF_WORK',
]) {
  requireIncludes('apps/api/src/persistence/persistence.tokens.ts', token, `缺少 Repository Token：${token}`);
}

requireIncludes('apps/api/src/database/database-safety.ts', "source === 'postgres'", 'PostgreSQL 模式不存在。');
requireIncludes('apps/api/src/database/database-safety.ts', "return 'mock'", 'mock 模式不存在。');
requireIncludes('apps/api/src/database/database-safety.ts', '不支持的数据源配置。', '未知 DATA_SOURCE 未使用中文错误。');
requireIncludes('apps/api/src/database/database-safety.ts', "target === 'staging'", 'PostgreSQL 模式未限制 DB_TARGET=staging。');
requireIncludes('apps/api/src/database/database-safety.ts', "ALLOW_TEST_DB_CONNECT", 'PostgreSQL 连接闸门缺失。');
requireIncludes('apps/api/src/database/database-safety.ts', "ALLOW_PRISMA_WRITE", '写入闸门缺失。');
requireIncludes('apps/api/src/database/database-safety.ts', "RUN_PRISMA_MIGRATE_DEPLOY", '启动 migrate 禁止闸门缺失。');
requireIncludes('apps/api/src/database/database-safety.ts', 'PostgreSQL 写入闸门尚未开启。', '写入关闭未返回中文 503 语义。');

requireIncludes('apps/api/src/database/prisma.service.ts', 'implements OnModuleInit, OnModuleDestroy', 'PrismaService 未按生命周期连接。');
requireIncludes('apps/api/src/database/prisma.service.ts', 'DATA_SOURCE=mock；不会实例化 PrismaClient。', 'mock 模式仍可能实例化 Prisma。');
requireIncludes('apps/api/src/database/prisma.service.ts', '$connect', 'PrismaService 未显式连接。');
requireIncludes('apps/api/src/database/prisma.service.ts', '$disconnect', 'PrismaService 未显式断开连接。');
requireNotIncludes('apps/api/src/database/prisma.service.ts', 'migrate deploy', 'PrismaService 不得执行 migrate。');
requireNotIncludes('apps/api/src/database/prisma.service.ts', 'db seed', 'PrismaService 不得执行 seed。');

for (const path of [
  'apps/api/src/document-hub/document-hub.service.ts',
  'apps/api/src/document-hub/order-import.service.ts',
  'apps/api/src/document-hub/order-status-sync.service.ts',
  'apps/api/src/document-hub/pdf-import-preview.service.ts',
  'apps/api/src/document-hub/pdf-import-apply.service.ts',
  'apps/api/src/document-hub/document-version.service.ts',
  'apps/api/src/document-hub/document-lifecycle.service.ts',
  'apps/api/src/documents/documents.service.ts',
  'apps/api/src/audit/audit.service.ts',
  'apps/api/src/unified-documents/helpers/delete-lock.service.ts',
]) {
  const text = read(path);
  if (/(DrawingMetadataStore|OrderMetadataStore)/.test(text)) failures.push(`${path} 仍直接依赖 Store。`);
  if (/delete-lock-settings\.json|drawing-customers\.json|drawing-products\.json|drawing-module-settings\.json/.test(text)) failures.push(`${path} 仍直接拼接 metadata 文件名。`);
}

requireIncludes('apps/api/src/health/health.controller.ts', 'databaseConnected', 'health 缺少 databaseConnected。');
requireIncludes('apps/api/src/runtime/runtime.controller.ts', 'prismaWriteEnabled', 'runtime 缺少 prismaWriteEnabled。');
requireNotIncludes('apps/api/src/health/health.controller.ts', 'DATABASE_URL', 'health 不得泄露 DATABASE_URL。');
requireNotIncludes('apps/api/src/runtime/runtime.controller.ts', 'DATABASE_URL', 'runtime 不得泄露 DATABASE_URL。');

if (failures.length) {
  console.error(failures.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log('PostgreSQL persistence foundation check passed.');
