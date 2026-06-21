import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();
const blockers = [];

function assert(condition, message) {
  if (!condition) blockers.push(message);
}

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function sliceBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = endMarker ? text.indexOf(endMarker, start + startMarker.length) : -1;
  if (start < 0) return '';
  return text.slice(start, end > start ? end : undefined);
}

function changedFiles() {
  const result = spawnSync('git', ['status', '--short'], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.error) {
    blockers.push(`Could not inspect git status: ${result.error.message}`);
    return [];
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.slice(3).trim())
    .filter(Boolean)
    .map((line) => line.includes(' -> ') ? line.split(' -> ').pop() ?? line : line);
}

const apiPath = 'apps/tablet/src/services/api.ts';
const storePath = 'apps/tablet/src/stores/document-hub-store.ts';
const typePath = 'apps/tablet/src/types/pdf-import.ts';
const scriptPath = 'scripts/pdf-import-frontend-state-check.mjs';
const packagePath = 'package.json';
const pdfImportUiPaths = [
  'apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue',
  'apps/tablet/src/components/hub/WarmHubHeader.vue',
  'apps/tablet/src/components/drawing/WarmPdfImportDialog.vue',
  'apps/tablet/src/components/drawing/WarmPdfImportFilePanel.vue',
  'apps/tablet/src/components/drawing/WarmPdfImportPreviewTable.vue',
  'apps/tablet/src/components/drawing/WarmPdfImportResult.vue',
  'scripts/pdf-import-ui-check.mjs',
];
const uploadPhasePaths = [
  'apps/tablet/src/components/hub/WarmHubUploadDialog.vue',
  'apps/tablet/src/components/upload/WarmUploadSourcePicker.vue',
  'apps/tablet/src/components/upload/WarmCameraCaptureDialog.vue',
  'apps/tablet/src/components/upload/WarmFileSelectionPanel.vue',
  'apps/tablet/src/components/upload/WarmUploadPreviewGrid.vue',
  'apps/tablet/src/components/upload/WarmUploadProgress.vue',
  'apps/tablet/src/types/production.ts',
  'apps/api/src/common/enums/production.enum.ts',
  'apps/api/src/common/types/production.types.ts',
  'apps/api/src/document-hub/document-hub.controller.ts',
  'apps/api/src/document-hub/document-hub.service.ts',
  'apps/api/src/document-hub/dto/upload-drawing-item.dto.ts',
  'apps/api/src/documents/documents.service.ts',
  'apps/api/src/documents/dto/upload-document.dto.ts',
  'apps/api/src/migration/mappers/shared.ts',
  'apps/api/src/repositories/mock/mock-document.repository.ts',
  'apps/api/src/repositories/prisma/prisma-mappers.ts',
  'scripts/camera-upload-check.mjs',
  'scripts/real-upload-ui-check.mjs',
  'scripts/tablet-ui-smoke-check.mjs',
];
const uploadPhasePrefixes = [
  'apps/tablet/src/components/upload/',
];

assert(existsSync(join(root, typePath)), 'PDF import type file should exist.');
assert(existsSync(join(root, scriptPath)), 'PDF import frontend state check script should exist.');

const apiSource = read(apiPath);
const storeSource = read(storePath);
const typeSource = read(typePath);
const packageSource = read(packagePath);

const previewApi = sliceBetween(apiSource, 'export async function previewDrawingPdfImport', 'export async function getDrawingPdfImportBatch');
const batchApi = sliceBetween(apiSource, 'export async function getDrawingPdfImportBatch', 'export async function applyDrawingPdfImport');
const applyApi = sliceBetween(apiSource, 'export async function applyDrawingPdfImport', 'export function getHubConnectors');
const applyPayload = sliceBetween(storeSource, 'function makePdfImportApplyPayload', 'async function refreshDrawingDataAfterPdfApply');
const applyAction = sliceBetween(storeSource, 'async function applyPdfImport', 'function resetPdfImport');
const updateItemAction = sliceBetween(storeSource, 'function updatePdfImportItem', 'function isPdfImportPreviewExpired');
const picker = sliceBetween(storeSource, 'function pickPdfImportItemPatch', 'const orderStatusRank');

assert(typeSource.includes('export type PdfImportAction'), 'PdfImportAction type should be declared.');
for (const value of ['create_product', 'add_version', 'skip_duplicate', 'needs_confirmation', 'error']) {
  assert(typeSource.includes(`'${value}'`), `PdfImportAction should include ${value}.`);
}
assert(typeSource.includes('export type PdfImportPreviewStatus'), 'PdfImportPreviewStatus type should be declared.');
for (const value of ['previewed', 'expired', 'applying', 'completed', 'partially_applied', 'failed']) {
  assert(typeSource.includes(`'${value}'`), `PdfImportPreviewStatus should include ${value}.`);
}
assert(typeSource.includes('export type PdfImportApplyResult'), 'PdfImportApplyResult type should be declared.');
assert(typeSource.includes('PdfImportPreviewResponse'), 'Preview response type should be declared.');
assert(typeSource.includes('PdfImportApplyRequest'), 'Apply request type should be declared.');
assert(!typeSource.includes('stagedFileKey'), 'Frontend PDF import types must not expose stagedFileKey.');
assert(!typeSource.includes('Buffer'), 'Frontend PDF import types must not expose Buffer.');

assert(apiSource.includes('previewDrawingPdfImport'), 'Preview API method should exist.');
assert(apiSource.includes('getDrawingPdfImportBatch'), 'Batch GET API method should exist.');
assert(apiSource.includes('applyDrawingPdfImport'), 'Apply API method should exist.');
assert(previewApi.includes('new FormData()'), 'Preview API should use FormData.');
assert(previewApi.includes("formData.append('customerId'"), 'Preview API should append customerId.');
assert(previewApi.includes("formData.append('files'"), 'Preview API should append files under files field.');
assert(previewApi.includes("'/document-hub/drawings/pdf-import/preview'"), 'Preview API should call the backend preview endpoint.');
assert(batchApi.includes("'/document-hub/drawings/pdf-import/") || batchApi.includes('`/document-hub/drawings/pdf-import/'), 'Batch API should call the backend batch endpoint.');
assert(applyApi.includes("'/document-hub/drawings/pdf-import/apply'"), 'Apply API should call the backend apply endpoint.');
assert(!/Content-Type['"]?\s*:\s*['"]multipart\/form-data/i.test(previewApi), 'Preview API must not manually set multipart Content-Type.');
assert(!/boundary/i.test(previewApi), 'Preview API must not manually set multipart boundary.');
assert(!/mock|fallback|fake/i.test(previewApi + batchApi + applyApi), 'PDF import API methods must not provide mock/fake fallback.');
assert(apiSource.includes('PDF 导入请求失败，请检查网络连接。'), 'PDF import API should map network failures to the required Chinese message.');

for (const stateName of [
  'pdfImportPreview',
  'pdfImportBatchId',
  'pdfImportPreviewLoading',
  'pdfImportApplyLoading',
  'pdfImportBatchLoading',
  'pdfImportError',
  'pdfImportSelectedCustomerId',
  'pdfImportFiles',
  'pdfImportItems',
  'pdfImportApplyResult',
  'pdfImportLastUpdatedAt',
]) {
  assert(storeSource.includes(stateName), `Store state ${stateName} should exist.`);
}
for (const actionName of [
  'setPdfImportCustomer',
  'setPdfImportFiles',
  'previewPdfImport',
  'loadPdfImportBatch',
  'updatePdfImportItem',
  'applyPdfImport',
  'resetPdfImport',
  'retryPdfImportBatch',
]) {
  assert(storeSource.includes(actionName), `Store action ${actionName} should exist.`);
}

for (const field of ['selected', 'confirmedProductModel', 'confirmedVersion', 'productName', 'setAsEffective']) {
  assert(storeSource.includes(`'${field}'`), `Item update whitelist should include ${field}.`);
}
for (const forbidden of ['stagedFileKey', 'checksum', 'customerId', 'existingProductId', 'existingDocumentId']) {
  assert(!picker.includes(forbidden), `Item patch picker must not allow ${forbidden}.`);
  assert(!applyPayload.includes(forbidden), `Apply payload must not include ${forbidden}.`);
}
assert(updateItemAction.includes('pickPdfImportItemPatch'), 'updatePdfImportItem should use the whitelist picker.');
assert(applyAction.includes("action === 'needs_confirmation'"), 'Apply action should validate needs_confirmation items.');
assert(applyAction.includes('PDF 导入预览已过期，请重新选择文件。'), 'Apply action should reject expired previews.');
assert(applyAction.includes('请至少选择一项需要导入的 PDF。'), 'Apply action should reject empty selection.');
assert(applyAction.includes('不允许重复点击。'), 'Apply action should reject duplicate apply clicks.');
assert(applyAction.includes('partially_applied'), 'Apply action should preserve partial success results.');

const applyCallIndex = applyAction.indexOf('await applyDrawingPdfImport');
const refreshIndex = applyAction.indexOf('await refreshDrawingDataAfterPdfApply(response)');
assert(applyCallIndex >= 0 && refreshIndex > applyCallIndex, 'Store should refresh formal drawing data only after Apply API succeeds.');
assert(!applyAction.slice(0, applyCallIndex).includes('productModels.value'), 'Store must not mutate product list before Apply API succeeds.');
assert(!applyAction.slice(0, applyCallIndex).includes('productDrawingDetail.value'), 'Store must not mutate product detail before Apply API succeeds.');
assert(!applyAction.slice(0, applyCallIndex).includes('localDetails.value'), 'Store must not mutate local details before Apply API succeeds.');

assert(storeSource.includes('file.size > PDF_IMPORT_MAX_FILE_SIZE'), 'Store should validate 30 MB file limit before preview.');
assert(storeSource.includes('PDF_IMPORT_MAX_FILES'), 'Store should validate max 50 files before preview.');
assert(storeSource.includes('isPdfFile'), 'Store should validate PDF files before preview.');
assert(!/mock|fake/i.test(sliceBetween(storeSource, 'async function previewPdfImport', 'async function loadPdfImportBatch')), 'Preview action must not create mock/fake previews.');
assert(!/mock|fake|localDetails\.value|mockHubProducts/i.test(applyAction), 'Apply action must not create mock/fake product data on failure.');

const changed = changedFiles();
const v3147RegressionPaths = [
  'apps/tablet/src/components/orders/WarmOrderCard.vue',
  'scripts/camera-upload-check.mjs',
  'scripts/document-home-preview-check.mjs',
  'scripts/document-viewer-foundation-check.mjs',
  'scripts/document-viewer-thumbnail-check.mjs',
  'scripts/order-frontend-state-check.mjs',
  'scripts/order-sidebar-layout-check.mjs',
  'scripts/pdf-import-ui-check.mjs',
];
const allowedChanges = new Set([
  apiPath,
  storePath,
  typePath,
  scriptPath,
  packagePath,
  'scripts/drawing-service-store-check.mjs',
  ...v3147RegressionPaths,
  ...pdfImportUiPaths,
  ...uploadPhasePaths,
]);
for (const file of changed) {
  const normalized = file.replaceAll('\\', '/');
  const allowedByPrefix = uploadPhasePrefixes.some((prefix) => normalized.startsWith(prefix));
  assert(allowedChanges.has(normalized) || allowedByPrefix, `Unexpected changed file: ${file}`);
}
assert(!changed.some((file) => {
  const normalized = file.replaceAll('\\', '/');
  return normalized.includes('apps/tablet/src/components/')
    && !pdfImportUiPaths.includes(normalized)
    && !v3147RegressionPaths.includes(normalized)
    && !uploadPhasePaths.includes(normalized)
    && !uploadPhasePrefixes.some((prefix) => normalized.startsWith(prefix));
}), 'Unrelated visible UI components must remain unchanged.');
assert(!changed.some((file) => file.includes('apps/tablet/src/views/')), 'Tablet views must remain unchanged.');
assert(!changed.some((file) => file.includes('apps/api/') && !uploadPhasePaths.includes(file.replaceAll('\\', '/'))), 'Unexpected backend files must remain unchanged.');
assert(!changed.some((file) => file.includes('prisma/') && !uploadPhasePaths.includes(file.replaceAll('\\', '/'))), 'Unexpected Prisma files must remain unchanged.');
assert(!changed.some((file) => file.includes('connector') && file !== storePath), 'Connector files must remain unchanged.');
assert(!changed.some((file) => file.includes('fixture') && file !== storePath), 'Fixture files must remain unchanged.');

const changedSource = [apiSource, storeSource, typeSource].join('\n');
assert(!/new\s+PrismaClient|DATABASE_URL|Sealos|db push|migrate/i.test(changedSource), 'Frontend PDF import data layer must not connect database or Sealos.');
assert(packageSource.includes('"pdf-import-frontend-state:check": "node scripts/pdf-import-frontend-state-check.mjs"'), 'Root package.json should expose pdf-import-frontend-state:check.');

if (blockers.length) {
  console.error('PDF import frontend state check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('PDF import frontend state check passed.');
