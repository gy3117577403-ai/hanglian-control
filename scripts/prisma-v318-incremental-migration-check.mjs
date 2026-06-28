#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const failures = [];

const initialMigrationPath = 'apps/api/prisma/migrations/20260617000100_initial_schema/migration.sql';
const incrementalMigrationPath =
  'apps/api/prisma/migrations/20260623010000_v318_persistence_upgrade/migration.sql';
const expectedInitialGitSha =
  'ef2508e428b7c3264bd06a353036a496afe0028a6ce849cf143f0f40fec6f3f6';

function fail(message) {
  failures.push(message);
}

function read(path) {
  if (!existsSync(path)) {
    fail(`缺少文件：${path}`);
    return '';
  }
  return readFileSync(path, 'utf8');
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function gitBlob(path) {
  return execFileSync('git', ['show', `HEAD:${path}`]);
}

function unique(values) {
  return [...new Set(values)];
}

const attributes = read('.gitattributes');
if (!attributes.includes('apps/api/prisma/migrations/**/migration.sql text eol=lf')) {
  fail('.gitattributes 未强制 migration.sql 使用 LF。');
}

if (!existsSync(initialMigrationPath)) {
  fail('初始 migration 不存在。');
} else {
  const initialGitSha = sha256(gitBlob(initialMigrationPath));
  if (initialGitSha !== expectedInitialGitSha) {
    fail(`初始 migration Git blob SHA-256 不匹配：${initialGitSha}`);
  }
}

const incrementalSql = read(incrementalMigrationPath);

if (/\r\n?/.test(incrementalSql)) {
  fail('增量 migration 必须使用 LF 换行。');
}

const createTables = unique(
  [...incrementalSql.matchAll(/CREATE\s+TABLE\s+"([^"]+)"/gi)].map((match) => match[1]),
);
const initialTables = unique(
  [...read(initialMigrationPath).matchAll(/CREATE\s+TABLE\s+"([^"]+)"/gi)].map((match) => match[1]),
);
const duplicatedInitialTables = createTables.filter((table) => initialTables.includes(table));
if (duplicatedInitialTables.length > 0) {
  fail(`增量 migration 不得重复创建初始表：${duplicatedInitialTables.join(', ')}`);
}

for (const [pattern, message] of [
  [/\bCREATE\s+DATABASE\b/i, '不得包含 CREATE DATABASE。'],
  [/\bCREATE\s+SCHEMA\b/i, '不得包含 CREATE SCHEMA。'],
  [/\bCREATE\s+ROLE\b/i, '不得包含 CREATE ROLE。'],
  [/\bALTER\s+ROLE\b/i, '不得包含 ALTER ROLE。'],
  [/\bGRANT\b/i, '不得包含 GRANT。'],
  [/\bREVOKE\b/i, '不得包含 REVOKE。'],
  [/\bDROP\s+TABLE\b/i, '不得包含 DROP TABLE。'],
  [/\bDROP\s+COLUMN\b/i, '不得包含 DROP COLUMN。'],
  [/\bTRUNCATE\b/i, '不得包含 TRUNCATE。'],
  [/\bDELETE\s+FROM\b/i, '不得包含 DELETE FROM。'],
  [/\bSET\s+search_path\b/i, '不得包含 SET search_path。'],
  [/\bpublic\./i, '不得引用 public schema。'],
  [/\bhanglian_control(?:_app|_final|_ready)?\b/i, '不得引用历史 schema。'],
  [/\bDATABASE_URL\b/i, '不得包含 DATABASE_URL。'],
  [/\bpostgres(?:ql)?:\/\//i, '不得包含数据库连接 URL。'],
  [/\b(secret|token)\b/i, '不得包含 Secret 或 Token。'],
]) {
  if (pattern.test(incrementalSql)) fail(message);
}

for (const table of [
  'ProductionOrder',
  'OrderImportBatch',
  'OrderImportItem',
  'ProductModule',
  'PdfImportBatch',
  'PdfImportItem',
  'DeleteLockSetting',
]) {
  if (!new RegExp(`CREATE\\s+TABLE\\s+"${table}"`, 'i').test(incrementalSql)) {
    fail(`增量 migration 缺少新表：${table}`);
  }
}

for (const fragment of [
  'ALTER TABLE "ProductDocument"',
  '"moduleId"',
  '"moduleKey"',
  '"checksumSha256"',
  '"documentStatus"',
  '"deleted"',
  '"sortOrder"',
  'ALTER TABLE "AuditLog"',
  '"orderId"',
  'QueryLog_userId_idx',
  'ConfirmationRecord_userId_idx',
  'FeedbackRecord_userId_idx',
]) {
  if (!incrementalSql.includes(fragment)) {
    fail(`增量 migration 缺少关键结构：${fragment}`);
  }
}

const foreignKeys = [...incrementalSql.matchAll(/ADD\s+CONSTRAINT\s+"([^"]+)"\s+FOREIGN\s+KEY/gi)].map(
  (match) => match[1],
);
for (const key of [
  'ProductionOrder_customerId_fkey',
  'ProductionOrder_linkedProductId_fkey',
  'ProductModule_productId_fkey',
  'ProductDocument_moduleId_fkey',
  'PdfImportBatch_customerId_fkey',
  'PdfImportItem_importBatchId_fkey',
]) {
  if (!foreignKeys.includes(key)) fail(`增量 migration 缺少外键：${key}`);
}

const scriptSource = read(import.meta.filename);
for (const api of [`exec${'Sync'}`, `spawn${'Sync'}`]) {
  if (scriptSource.includes(api)) {
    fail('检查脚本不得使用 shell 子进程。');
  }
}
if (!scriptSource.includes("execFileSync('git', ['show'")) {
  fail('检查脚本只允许通过 git show 读取已提交 blob。');
}

if (failures.length > 0) {
  console.error(failures.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log('V3.18 incremental migration check passed.');
