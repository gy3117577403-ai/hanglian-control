import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const rootDir = process.cwd();
const schemaPath = join(rootDir, 'apps/api/prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

function fail(message) {
  console.error(`Prisma drawing schema check failed: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function normalize(source) {
  return source.replace(/\s+/g, ' ').trim();
}

function modelBlock(name) {
  const match = schema.match(new RegExp(`model\\s+${name}\\s+\\{([\\s\\S]*?)\\n\\}`, 'm'));
  assert(match, `missing model ${name}`);
  return match[1];
}

function enumBlock(name) {
  const match = schema.match(new RegExp(`enum\\s+${name}\\s+\\{([\\s\\S]*?)\\n\\}`, 'm'));
  assert(match, `missing enum ${name}`);
  return match[1];
}

function hasField(block, field) {
  return new RegExp(`^\\s*${field}\\s+`, 'm').test(block);
}

function hasFields(block, fields, modelName) {
  for (const field of fields) {
    assert(hasField(block, field), `${modelName} missing field ${field}`);
  }
}

function hasLine(block, pattern, message) {
  assert(pattern.test(block), message);
}

function compactIncludes(block, text, message) {
  assert(normalize(block).includes(text), message);
}

function gitOutput(args) {
  return execFileSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

const customer = modelBlock('Customer');
const product = modelBlock('Product');
const productModule = modelBlock('ProductModule');
const productDocument = modelBlock('ProductDocument');
const pdfImportBatch = modelBlock('PdfImportBatch');
const pdfImportItem = modelBlock('PdfImportItem');
const deleteLock = modelBlock('DeleteLockSetting');
const auditLog = modelBlock('AuditLog');
const backProcessPackage = modelBlock('BackProcessPackage');
const fixture = modelBlock('Fixture');

enumBlock('DocumentSource');
enumBlock('AuditEntityType');
enumBlock('AuditAction');

hasFields(customer, [
  'id',
  'name',
  'customerName',
  'customerShortName',
  'customerCode',
  'aliases',
  'status',
  'deletedAt',
  'products',
  'pdfImportBatches',
  'createdAt',
  'updatedAt',
], 'Customer');
hasLine(customer, /@@index\(\[customerName\]\)/, 'Customer must index customerName');
hasLine(customer, /@@index\(\[deletedAt\]\)/, 'Customer must index deletedAt');
assert(!/^\s*customerName\s+String\s+@unique/m.test(customer), 'Customer.customerName must not be globally unique');

hasFields(product, [
  'id',
  'customerId',
  'customer',
  'productCode',
  'productModel',
  'normalizedProductModel',
  'productName',
  'drawingStatus',
  'source',
  'remark',
  'searchKeywords',
  'deletedAt',
  'modules',
  'documents',
], 'Product');
compactIncludes(product, '@@unique([customerId, normalizedProductModel])', 'Product must enforce customerId + normalizedProductModel uniqueness');
for (const index of ['customerId', 'normalizedProductModel', 'drawingStatus', 'deletedAt', 'updatedAt']) {
  hasLine(product, new RegExp(`@@index\\(\\[${index}\\]\\)`), `Product must index ${index}`);
}
hasLine(product, /onDelete:\s*Restrict/, 'Product.customer relation should use Restrict');

hasFields(productModule, [
  'id',
  'productId',
  'product',
  'moduleKey',
  'moduleName',
  'status',
  'remark',
  'coverDocumentId',
  'coverDocument',
  'itemCount',
  'documents',
  'createdAt',
  'updatedAt',
], 'ProductModule');
compactIncludes(productModule, '@@unique([productId, moduleKey])', 'ProductModule must enforce productId + moduleKey uniqueness');
for (const index of ['productId', 'moduleKey', 'status', 'coverDocumentId', 'updatedAt']) {
  hasLine(productModule, new RegExp(`@@index\\(\\[${index}\\]\\)`), `ProductModule must index ${index}`);
}
hasLine(productModule, /ProductModuleCoverDocument/, 'ProductModule cover relation must be explicitly named');
hasLine(productModule, /ProductModuleDocuments/, 'ProductModule documents relation must be explicitly named');
hasLine(productModule, /coverDocument[\s\S]*onDelete:\s*SetNull/, 'ProductModule cover document should use SetNull');

hasFields(productDocument, [
  'id',
  'productId',
  'moduleId',
  'moduleKey',
  'title',
  'version',
  'contentKind',
  'source',
  'storageProvider',
  'storageKey',
  'originalFileName',
  'storedFileName',
  'mimeType',
  'fileSize',
  'checksumSha256',
  'pageCount',
  'imageWidth',
  'imageHeight',
  'previewMode',
  'previewUrl',
  'downloadUrl',
  'keywordMeta',
  'remark',
  'sortOrder',
  'isCover',
  'documentStatus',
  'effectiveDate',
  'deleted',
  'deletedAt',
  'deletedBy',
  'deleteReason',
  'restoredAt',
  'restoredBy',
  'createdAt',
  'updatedAt',
  'coverForModules',
], 'ProductDocument');
for (const index of ['moduleId', 'moduleKey', 'checksumSha256', 'documentStatus', 'deleted', 'createdAt', 'updatedAt']) {
  hasLine(productDocument, new RegExp(`@@index\\(\\[${index}\\]\\)`), `ProductDocument must index ${index}`);
}
compactIncludes(productDocument, '@@index([productId, moduleKey, deleted])', 'ProductDocument must index productId + moduleKey + deleted');
compactIncludes(productDocument, '@@index([productId, moduleKey, checksumSha256])', 'ProductDocument must index productId + moduleKey + checksumSha256');
assert(!hasField(productDocument, 'stagedFileKey'), 'ProductDocument must not contain stagedFileKey');
assert(!hasField(productDocument, 'passwordHash'), 'ProductDocument must not contain passwordHash');
assert(!hasField(productDocument, 'password'), 'ProductDocument must not contain plaintext password');

hasFields(pdfImportBatch, [
  'id',
  'customerId',
  'customer',
  'status',
  'totalFiles',
  'successCount',
  'skippedCount',
  'errorCount',
  'needsConfirmationCount',
  'expiresAt',
  'completedAt',
  'appliedAt',
  'applyStatus',
  'applySummary',
  'operatorId',
  'operatorName',
  'items',
  'createdAt',
  'updatedAt',
], 'PdfImportBatch');
for (const index of ['customerId', 'status', 'expiresAt', 'createdAt', 'appliedAt']) {
  hasLine(pdfImportBatch, new RegExp(`@@index\\(\\[${index}\\]\\)`), `PdfImportBatch must index ${index}`);
}
hasLine(pdfImportBatch, /onDelete:\s*Restrict/, 'PdfImportBatch.customer relation should use Restrict');

hasFields(pdfImportItem, [
  'id',
  'importBatchId',
  'batch',
  'originalFileName',
  'stagedFileKey',
  'mimeType',
  'fileSize',
  'checksumSha256',
  'parsedProductModel',
  'confirmedProductModel',
  'parsedVersion',
  'confirmedVersion',
  'confidence',
  'needsConfirmation',
  'parseWarnings',
  'existingProductId',
  'existingDocumentId',
  'action',
  'selected',
  'setAsEffective',
  'productName',
  'result',
  'resultProductId',
  'resultDocumentId',
  'message',
  'errorMessage',
  'appliedAt',
  'createdAt',
  'updatedAt',
], 'PdfImportItem');
for (const index of ['importBatchId', 'checksumSha256', 'action', 'result', 'existingProductId', 'resultProductId', 'appliedAt', 'createdAt']) {
  hasLine(pdfImportItem, new RegExp(`@@index\\(\\[${index}\\]\\)`), `PdfImportItem must index ${index}`);
}
compactIncludes(pdfImportItem, '@@unique([importBatchId, id])', 'PdfImportItem must protect importBatchId + id ownership');
for (const relation of ['PdfImportExistingProduct', 'PdfImportResultProduct', 'PdfImportExistingDocument', 'PdfImportResultDocument']) {
  hasLine(pdfImportItem, new RegExp(relation), `PdfImportItem missing relation ${relation}`);
}

hasFields(deleteLock, [
  'id',
  'enabled',
  'passwordHash',
  'failedAttempts',
  'lockedUntil',
  'updatedBy',
  'createdAt',
  'updatedAt',
], 'DeleteLockSetting');
assert(!/^\s*password\s+/m.test(deleteLock), 'DeleteLockSetting must not contain plaintext password');
hasLine(deleteLock, /failedAttempts\s+Int\s+@default\(0\)/, 'DeleteLockSetting.failedAttempts should default to 0');
hasLine(deleteLock, /enabled\s+Boolean\s+@default\(true\)/, 'DeleteLockSetting.enabled should default to true');

hasFields(auditLog, [
  'entityType',
  'entityId',
  'action',
  'customerId',
  'productId',
  'operatorId',
  'operatorName',
  'beforeJson',
  'afterJson',
  'message',
  'createdAt',
], 'AuditLog');
for (const index of ['entityType', 'entityId', 'action', 'customerId', 'productId', 'operatorId', 'createdAt']) {
  hasLine(auditLog, new RegExp(`@@index\\(\\[${index}\\]\\)`), `AuditLog must index ${index}`);
}
assert(!hasField(auditLog, 'password'), 'AuditLog must not contain plaintext password');
assert(!hasField(auditLog, 'passwordHash'), 'AuditLog must not contain passwordHash');

assert(/\bPDF_IMPORT\b/.test(enumBlock('DocumentSource')), 'DocumentSource should include PDF_IMPORT');
assert(/\bPRODUCT_MODULE\b/.test(enumBlock('AuditEntityType')), 'AuditEntityType should include PRODUCT_MODULE');
assert(/\bDOCUMENT_TRASHED\b/.test(enumBlock('AuditAction')), 'AuditAction should include document lifecycle actions');
assert(hasField(backProcessPackage, 'connectorModel'), 'Connector model fields must remain available');
assert(hasField(fixture, 'fixtureCode'), 'Fixture model must remain available');
assert(!/\bBytes\b/.test(schema), 'Schema must not add Bytes/blob file body fields');
assert(!/DATABASE_URL\s*=/.test(schema), 'Schema must not hard-code DATABASE_URL');

const migrationStatus = gitOutput(['status', '--short', 'apps/api/prisma/migrations']);
assert(!migrationStatus, 'Migration files must remain unchanged');

console.log('Prisma drawing schema check passed.');
