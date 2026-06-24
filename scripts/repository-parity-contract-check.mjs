#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const failures = [];
const types = readFileSync('apps/api/src/persistence/persistence.types.ts', 'utf8');
const versionRules = readFileSync('apps/api/src/common/utils/document-version-rules.ts', 'utf8');
const scriptVersionRules = readFileSync('scripts/document-version-rules.mjs', 'utf8');
const versionService = readFileSync('apps/api/src/document-hub/document-version.service.ts', 'utf8');
const prismaDocumentRepository = readFileSync('apps/api/src/repositories/prisma/prisma-document.repository.ts', 'utf8');
const mockDocumentRepository = readFileSync('apps/api/src/repositories/mock/mock-document.repository.ts', 'utf8');
const migrationPlan = readFileSync('scripts/json-migration-plan.mjs', 'utf8');
const migrationImport = readFileSync('scripts/json-to-postgres-import.mjs', 'utf8');
const tsSingleEffectiveList = versionRules.match(/singleEffectiveDrawingModuleKeys[\s\S]*?\] as const;/)?.[0] ?? '';
const jsSingleEffectiveList = scriptVersionRules.match(/singleEffectiveDrawingModuleKeys[\s\S]*?\]\);/)?.[0] ?? '';

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

if (!versionRules.includes('supportsSingleEffectiveVersion') || !versionRules.includes("'finished_images'")) {
  failures.push('Unified document version rule helper is missing finished_images handling.');
}

if (tsSingleEffectiveList.includes("'finished_images'")) {
  failures.push('finished_images must not be listed as a single-effective module.');
}

if (!versionRules.includes('supportsSingleEffectiveDocumentType')) {
  failures.push('Repository layer must have a document-type single-effective predicate.');
}

if (!scriptVersionRules.includes('supportsSingleEffectiveVersion') || jsSingleEffectiveList.includes("'finished_images'")) {
  failures.push('JSON migration scripts must share a helper that excludes finished_images from single-effective checks.');
}

if (!versionService.includes('supportsSingleEffectiveVersion(moduleKey)') || versionService.includes('effectiveModuleKeys')) {
  failures.push('DocumentVersionService must use the unified single-effective predicate.');
}

for (const [name, text] of [
  ['PrismaDocumentRepository', prismaDocumentRepository],
  ['MockDocumentRepository', mockDocumentRepository],
]) {
  if (!text.includes('supportsSingleEffectiveDocumentType')) {
    failures.push(`${name} must preserve multiple effective finished_detail_image documents.`);
  }
}

if (!migrationPlan.includes('documentEffectiveVersionGroupKey') || !migrationPlan.includes('supportsSingleEffectiveVersion')) {
  failures.push('JSON migration plan must check multiple-effective documents with shared version rules.');
}

if (!migrationPlan.includes('isInactiveDocumentForEffectiveCheck')) {
  failures.push('JSON migration plan must exclude deleted/archived/trashed documents from effective conflicts.');
}

if (migrationPlan.includes('const key = `${productId}:${moduleKey}`')) {
  failures.push('JSON migration plan must not group effective conflicts only by productId and moduleKey.');
}

if (/expireOtherEffective|historical|documentStatus\s*=/.test(migrationImport)) {
  failures.push('JSON import dry-run must not downgrade or overwrite documentStatus.');
}

if (failures.length) {
  console.error(failures.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log('Repository parity contract check passed.');
