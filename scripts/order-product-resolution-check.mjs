import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const root = process.cwd();
const failures = [];

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function pass(condition, message) {
  if (!condition) failures.push(message);
}

function has(source, pattern) {
  return typeof pattern === 'string' ? source.includes(pattern) : pattern.test(source);
}

function indexOf(source, pattern) {
  return typeof pattern === 'string' ? source.indexOf(pattern) : source.search(pattern);
}

function methodBody(source, methodName) {
  const start = source.indexOf(methodName);
  if (start < 0) return '';
  const braceStart = source.indexOf('{', start);
  if (braceStart < 0) return '';
  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(braceStart, index + 1);
    }
  }
  return '';
}

function section(source, startPattern, endPattern) {
  const start = source.indexOf(startPattern);
  if (start < 0) return '';
  const end = source.indexOf(endPattern, start + startPattern.length);
  return end < 0 ? source.slice(start) : source.slice(start, end);
}

const files = {
  controller: 'apps/api/src/document-hub/document-hub.controller.ts',
  service: 'apps/api/src/document-hub/document-hub.service.ts',
  resolveDto: 'apps/api/src/document-hub/dto/resolve-drawing-product.dto.ts',
  metadataStore: 'apps/api/src/document-hub/drawing-metadata.store.ts',
  api: 'apps/tablet/src/services/api.ts',
  store: 'apps/tablet/src/stores/document-hub-store.ts',
  productionTypes: 'apps/tablet/src/types/production.ts',
  resolutionTypes: 'apps/tablet/src/types/product-resolution.ts',
  libraryView: 'apps/tablet/src/components/drawing/WarmDrawingLibraryView.vue',
  unarchivedPanel: 'apps/tablet/src/components/drawing/WarmUnarchivedProductPanel.vue',
  createDialog: 'apps/tablet/src/components/drawing/WarmCreateProductArchiveDialog.vue',
  dashboard: 'apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue',
  pdfDialog: 'apps/tablet/src/components/drawing/WarmPdfImportDialog.vue',
  packageJson: 'package.json',
};

for (const [label, path] of Object.entries(files)) {
  pass(existsSync(resolve(root, path)), `${label} missing: ${path}`);
}

const controller = read(files.controller);
const service = read(files.service);
const api = read(files.api);
const store = read(files.store);
const productionTypes = read(files.productionTypes);
const resolutionTypes = read(files.resolutionTypes);
const libraryView = read(files.libraryView);
const unarchivedPanel = read(files.unarchivedPanel);
const createDialog = read(files.createDialog);
const dashboard = read(files.dashboard);
const packageJson = read(files.packageJson);

const resolveRouteIndex = indexOf(controller, "@Get('drawings/products/resolve')");
const productIdRouteIndex = indexOf(controller, "@Get('drawings/products/:productId')");
pass(resolveRouteIndex >= 0, 'Backend resolve route is missing.');
pass(productIdRouteIndex >= 0 && resolveRouteIndex >= 0 && resolveRouteIndex < productIdRouteIndex, 'Resolve route must be before dynamic productId route.');
pass(has(controller, 'ResolveDrawingProductDto'), 'Resolve DTO is not wired into controller.');
pass(has(service, 'resolveDrawingProduct(query: ResolveDrawingProductDto)'), 'DocumentHubService resolve method is missing.');

const resolveBody = methodBody(service, 'resolveDrawingProduct(query: ResolveDrawingProductDto)');
pass(has(resolveBody, 'normalizeProductModel'), 'Resolve must normalize product model.');
pass(has(resolveBody, "status: 'found'"), 'Resolve must return found status.');
pass(has(resolveBody, "status: 'product_not_found'"), 'Resolve must return product_not_found status.');
pass(has(resolveBody, "status: 'customer_not_found'"), 'Resolve must return customer_not_found status.');
pass(!has(resolveBody, 'writeProducts(') && !has(resolveBody, 'createDrawingProduct('), 'Resolve GET must not create or write products.');
pass(!has(resolveBody, 'storageKey') && !has(resolveBody, 'checksumSha256'), 'Resolve response must not expose storageKey or checksums directly.');
pass(has(service, 'findResolveCustomer') && has(service, 'aliases ?? []'), 'Resolve must match customer name, short name, and aliases.');
const safeResolveModulesBody = methodBody(service, 'private safeResolveModules');
pass(has(safeResolveModulesBody, 'itemId') && !has(safeResolveModulesBody, 'storageKey'), 'Resolve module sanitizer must omit storageKey.');

pass(has(api, 'resolveHubDrawingProduct') && has(api, "/document-hub/drawings/products/resolve"), 'Frontend resolve API is missing.');
pass(has(api, 'createHubDrawingProduct') && has(api, "method: 'POST'") && has(api, "/document-hub/drawings/products"), 'Frontend product creation must use real POST API.');
pass(has(api, 'createHubDrawingCustomer') && has(api, "/document-hub/drawings/customers"), 'Frontend customer creation must use real POST API.');
pass(has(api, 'assertRealDrawingProductId') && has(api, "startsWith('missing-')") && has(api, "startsWith('mock-')"), 'Upload API must reject placeholder product ids.');

const openOrderBody = methodBody(store, 'async function openOrderProduct(order: HubOrder');
pass(has(openOrderBody, 'resolveHubDrawingProduct'), 'Order click must call resolve API.');
pass(has(openOrderBody, 'resolution.product.productId') && has(openOrderBody, 'openProduct(resolution.product'), 'Found resolution must open real product id.');
pass(has(openOrderBody, "drawingViewLevel.value = 'unarchived'"), 'Unarchived order must open unarchived state.');
pass(!has(store, 'createMissingDetail') && !has(store, 'missing-${order.orderId}'), 'Store must not create missing-* fake product detail.');
pass(has(store, 'resolvedProductId') && has(store, 'productResolutionStatus') && has(productionTypes, 'productResolutionCheckedAt'), 'Order resolution session state is missing.');

const createArchiveBody = section(store, 'async function createProductArchive(input', 'function openConnectorDetail');
pass(has(createArchiveBody, 'createHubDrawingProduct'), 'Blank archive creation must call real product POST API.');
pass(has(createArchiveBody, 'createHubDrawingCustomer'), 'Customer creation path must call real customer POST API.');
pass(has(createArchiveBody, 'resolveCurrentUnarchivedOrder'), 'Create archive must resolve after creation or conflict.');
pass(has(createArchiveBody, "source: 'manual_create'"), 'Blank archive creation must mark manual_create source.');
pass(has(service, "drawingStatus: 'no_drawing'") && has(service, 'makeProductDetail(customer, savedProduct)'), 'Backend product creation must create six empty modules and no_drawing status.');

pass(has(store, 'openPdfImportDialogForUnarchivedProduct') && has(store, 'setPdfImportCustomer'), 'PDF import must preselect matched customer.');
pass(has(store, 'bindCurrentOrderAfterPdfApply') && has(store, 'normalizeOrderProductModel') && has(store, 'resolveCurrentUnarchivedOrder'), 'PDF apply must bind matching order product after import.');
pass(has(store, 'PDF 已导入，但导入型号与当前订单型号不一致。'), 'PDF mismatch protection message is missing.');

const uploadAllBody = section(store, 'async function uploadAllItems(input?', 'function retryFailedItems');
pass(has(uploadAllBody, 'validateUploadProduct(productId)'), 'Upload must validate real product before sending.');
pass(indexOf(uploadAllBody, 'validateUploadProduct(productId)') < indexOf(uploadAllBody, 'uploadHubDrawingItem(productId'), 'Upload validation must run before upload API call.');
pass(has(store, 'warnUnarchivedUpload') && has(store, '当前型号尚未建立资料页，请先建档后再上传。'), 'Unarchived upload guidance is missing.');
pass(!/warnUnarchivedUpload[\s\S]{0,300}resetUploadState/.test(store), 'Upload protection must not clear selected files during archive guidance.');

pass(has(libraryView, "store.drawingViewLevel === 'unarchived'") && has(libraryView, 'WarmUnarchivedProductPanel'), 'Unarchived product panel is not rendered.');
pass(has(unarchivedPanel, '导入 PDF 图纸') && has(unarchivedPanel, '创建空白资料页') && has(unarchivedPanel, '请先建立产品资料页。'), 'Unarchived panel actions or prompt are incomplete.');
pass(!has(unarchivedPanel, 'missing-') && !has(unarchivedPanel, 'mock-'), 'Unarchived panel must not show placeholder ids.');
pass(has(createDialog, '创建产品资料页') && has(createDialog, 'confirmModelChanged') && has(createDialog, '六个资料模块'), 'Create archive dialog is incomplete.');
pass(has(dashboard, 'WarmCreateProductArchiveDialog') && has(dashboard, 'store.pdfImportDialogOpen'), 'Dashboard must mount archive dialog and shared PDF import dialog state.');

pass(has(resolutionTypes, 'ProductResolutionStatus') && has(resolutionTypes, 'customer_not_found') && has(resolutionTypes, 'product_not_found'), 'Product resolution types are incomplete.');
pass(has(packageJson, '"order-product-resolution:check": "node scripts/order-product-resolution-check.mjs"'), 'package.json script is missing.');

const changedFiles = new Set((process.env.ORDER_PRODUCT_RESOLUTION_CHANGED_FILES ?? '')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean));
for (const path of changedFiles) {
  const normalized = relative(root, resolve(root, path)).replace(/\\/g, '/');
  pass(!normalized.includes('/connector') && !normalized.includes('/fixture'), `Connector or fixture file changed: ${normalized}`);
  pass(!normalized.includes('/prisma/'), `Prisma file changed: ${normalized}`);
}

if (failures.length) {
  console.error('订单产品建档与图纸资料页绑定检查失败：');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('订单产品建档与图纸资料页绑定检查通过。');
