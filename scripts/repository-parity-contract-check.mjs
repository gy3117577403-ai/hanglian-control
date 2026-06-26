#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const failures = [];
const types = readFileSync('apps/api/src/persistence/persistence.types.ts', 'utf8');
const versionRules = readFileSync('apps/api/src/common/utils/document-version-rules.ts', 'utf8');
const scriptVersionRules = readFileSync('scripts/document-version-rules.mjs', 'utf8');
const versionService = readFileSync('apps/api/src/document-hub/document-version.service.ts', 'utf8');
const prismaDocumentRepository = readFileSync('apps/api/src/repositories/prisma/prisma-document.repository.ts', 'utf8');
const mockDocumentRepository = readFileSync('apps/api/src/repositories/mock/mock-document.repository.ts', 'utf8');
const prismaDrawingRepository = readFileSync('apps/api/src/persistence/prisma/prisma-drawing.repository.ts', 'utf8');
const documentHubService = readFileSync('apps/api/src/document-hub/document-hub.service.ts', 'utf8');
const migrationPlan = readFileSync('scripts/json-migration-plan.mjs', 'utf8');
const migrationImport = readFileSync('scripts/json-to-postgres-import.mjs', 'utf8');
const tsSingleEffectiveList = versionRules.match(/singleEffectiveDrawingModuleKeys[\s\S]*?\] as const;/)?.[0] ?? '';
const jsSingleEffectiveList = scriptVersionRules.match(/singleEffectiveDrawingModuleKeys[\s\S]*?\]\);/)?.[0] ?? '';

for (const method of [
  'readCustomers',
  'writeCustomers',
  'readProducts',
  'writeProducts',
  'readModuleState',
  'writeModuleState',
  'readDetails',
  'writeDetails',
  'upsertDetail',
  'makeProductDetail',
  'readImportRecords',
  'writeImportRecords',
  'upsertImportBatch',
  'rollbackNewProduct',
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

if (!types.includes('type MaybePromise<T> = T | Promise<T>')) {
  failures.push('DrawingRepository contract must support asynchronous PostgreSQL implementations.');
}

for (const method of [
  'ensureInitialized',
  'initializeFromSeedIfEmpty',
  'readCustomers',
  'writeCustomers',
  'readProducts',
  'writeProducts',
  'readModuleState',
  'writeModuleState',
  'readDetails',
  'writeDetails',
  'upsertDetail',
  'readImportRecords',
  'writeImportRecords',
  'upsertImportBatch',
  'rollbackNewProduct',
]) {
  if (!new RegExp(`${method}\\([^)]*\\): MaybePromise`).test(types)) {
    failures.push(`DrawingRepository method must be MaybePromise: ${method}`);
  }
}

for (const [method, pattern] of [
  ['readCustomers', /async\s+readCustomers[\s\S]*?customer\.findMany/],
  ['readProducts', /async\s+readProducts[\s\S]*?product\.findMany/],
  ['readDetails', /async\s+readDetails[\s\S]*?productModule[\s\S]*?productDocument/],
  ['readImportRecords', /async\s+readImportRecords[\s\S]*?pdfImportBatch[\s\S]*?pdfImportItem/],
]) {
  if (!pattern.test(prismaDrawingRepository)) failures.push(`PrismaDrawingRepository must implement real PostgreSQL read for ${method}.`);
}

for (const [method, pattern] of [
  ['writeCustomers', /async\s+writeCustomers[\s\S]*?\$transaction[\s\S]*?customer\.upsert/],
  ['writeProducts', /async\s+writeProducts[\s\S]*?\$transaction[\s\S]*?product\.upsert/],
  ['writeDetails', /async\s+writeDetails[\s\S]*?\$transaction[\s\S]*?productDocument\.upsert/],
  ['upsertImportBatch', /async\s+upsertImportBatch[\s\S]*?\$transaction[\s\S]*?pdfImportBatch\.upsert/],
  ['rollbackNewProduct', /async\s+rollbackNewProduct[\s\S]*?\$transaction[\s\S]*?product\.updateMany/],
]) {
  if (!pattern.test(prismaDrawingRepository)) failures.push(`PrismaDrawingRepository must implement transactional PostgreSQL write for ${method}.`);
}

for (const [method, pattern] of [
  ['readCustomers', /readCustomers[\s\S]*?return\s+\[\s*\]/],
  ['readProducts', /readProducts[\s\S]*?return\s+\[\s*\]/],
  ['readDetails', /readDetails[\s\S]*?return\s+\[\s*\]/],
  ['readImportRecords', /readImportRecords[\s\S]*?return\s+\[\s*\]/],
]) {
  if (pattern.test(prismaDrawingRepository)) failures.push(`PrismaDrawingRepository still contains a hard-coded empty result in ${method}.`);
}

if (/new\s+DrawingMetadataStore|\bdrawingMetadataStore\b/.test(prismaDrawingRepository)) {
  failures.push('PrismaDrawingRepository must not fall back to JSON DrawingMetadataStore in PostgreSQL mode.');
}

if (!/supportsSingleEffectiveVersion\([^)]*moduleKey/.test(prismaDrawingRepository)) {
  failures.push('PrismaDrawingRepository must preserve finished_images multi-effective semantics.');
}

if (
  !prismaDrawingRepository.includes('documentEffectiveVersionGroupKey') ||
  !/productId[\s\S]*moduleKey[\s\S]*versionGroupKey/.test(prismaDrawingRepository)
) {
  failures.push('PrismaDrawingRepository effective conflict scope must include productId, moduleKey, and versionGroupKey.');
}

if (
  !prismaDrawingRepository.includes('!document.archived && !document.archivedAt') ||
  !prismaDrawingRepository.includes('const visibleDocumentIds = new Set') ||
  !prismaDrawingRepository.includes('visibleDocumentIds.has(persistedCoverDocumentId)')
) {
  failures.push('PrismaDrawingRepository must exclude archived documents from current drawing modules and only honor visible coverDocumentId.');
}

if (!/itemCount:\s*items\.length/.test(prismaDrawingRepository)) {
  failures.push('PrismaDrawingRepository drawing module itemCount must equal current visible items length.');
}

if (!documentHubService.includes('await this.drawingRepository.readCustomers()') || !documentHubService.includes('await this.drawingRepository.readDetails()')) {
  failures.push('DocumentHubService must await asynchronous DrawingRepository reads.');
}

if (!documentHubService.includes('moduleForUploadedDocument') || !documentHubService.includes('drawingModuleKeySet')) {
  failures.push('DocumentHubService must merge uploaded PostgreSQL documents by explicit moduleKey when available.');
}

if (!readFileSync('apps/api/src/repositories/prisma/prisma-mappers.ts', 'utf8').includes('moduleKey: row.moduleKey')) {
  failures.push('Prisma document mapper must preserve ProductDocument.moduleKey for drawing module merges.');
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

if (!versionRules.includes('documentEffectiveConflictKey') || !versionRules.includes('normalizeEffectiveVersionGroupKey')) {
  failures.push('Unified document version rule helper must expose a product/module/version-group conflict key.');
}

if (!scriptVersionRules.includes('documentEffectiveConflictKey') || !scriptVersionRules.includes('normalizeEffectiveVersionGroupKey')) {
  failures.push('JSON migration version rule helper must expose a normalized product/module/version-group conflict key.');
}

if (!migrationPlan.includes('documentEffectiveConflictKey') || !migrationPlan.includes('supportsSingleEffectiveVersion')) {
  failures.push('JSON migration plan must check multiple-effective documents with shared version rules.');
}

if (!migrationPlan.includes('isInactiveDocumentForEffectiveCheck')) {
  failures.push('JSON migration plan must exclude deleted/archived/trashed documents from effective conflicts.');
}

if (migrationPlan.includes('const key = `${productId}:${moduleKey}`')) {
  failures.push('JSON migration plan must not group effective conflicts only by productId and moduleKey.');
}

if (!migrationPlan.includes('conflictKey') || !migrationPlan.includes('productId') || !migrationPlan.includes('moduleKey') || !migrationPlan.includes('versionGroupKey')) {
  failures.push('JSON migration plan conflict details must include productId, moduleKey, and versionGroupKey.');
}

if (/expireOtherEffective|historical|documentStatus\s*=/.test(migrationImport)) {
  failures.push('JSON import dry-run must not downgrade or overwrite documentStatus.');
}

if (failures.length) {
  console.error(failures.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log('Repository parity contract check passed.');
