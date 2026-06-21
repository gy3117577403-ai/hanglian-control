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
  if (start < 0) return '';
  const end = endMarker ? text.indexOf(endMarker, start + startMarker.length) : -1;
  return text.slice(start, end > start ? end : undefined);
}

function changedFiles() {
  const result = spawnSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' });
  if (result.error) {
    blockers.push(`Could not inspect git status: ${result.error.message}`);
    return [];
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.slice(3).trim())
    .filter(Boolean)
    .map((line) => line.includes(' -> ') ? line.split(' -> ').pop() ?? line : line)
    .map((line) => line.replaceAll('\\', '/'));
}

const paths = {
  sourcePicker: 'apps/tablet/src/components/upload/WarmUploadSourcePicker.vue',
  camera: 'apps/tablet/src/components/upload/WarmCameraCaptureDialog.vue',
  filePanel: 'apps/tablet/src/components/upload/WarmFileSelectionPanel.vue',
  previewGrid: 'apps/tablet/src/components/upload/WarmUploadPreviewGrid.vue',
  progress: 'apps/tablet/src/components/upload/WarmUploadProgress.vue',
  hubUpload: 'apps/tablet/src/components/hub/WarmHubUploadDialog.vue',
  drawingHome: 'apps/tablet/src/components/drawing/WarmProductDrawingHome.vue',
  moduleCard: 'apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue',
  moduleGallery: 'apps/tablet/src/components/drawing/WarmDrawingModuleGallery.vue',
  store: 'apps/tablet/src/stores/document-hub-store.ts',
  api: 'apps/tablet/src/services/api.ts',
  types: 'apps/tablet/src/types/production.ts',
  uploadDto: 'apps/api/src/document-hub/dto/upload-drawing-item.dto.ts',
  hubController: 'apps/api/src/document-hub/document-hub.controller.ts',
  hubService: 'apps/api/src/document-hub/document-hub.service.ts',
  documentsDto: 'apps/api/src/documents/dto/upload-document.dto.ts',
  documentsService: 'apps/api/src/documents/documents.service.ts',
  packageJson: 'package.json',
};

for (const [name, relativePath] of Object.entries(paths)) {
  assert(existsSync(join(root, relativePath)), `${name} should exist at ${relativePath}.`);
}

const sourcePicker = read(paths.sourcePicker);
const camera = read(paths.camera);
const filePanel = read(paths.filePanel);
const previewGrid = read(paths.previewGrid);
const progress = read(paths.progress);
const hubUpload = read(paths.hubUpload);
const drawingHome = read(paths.drawingHome);
const moduleCard = read(paths.moduleCard);
const moduleGallery = read(paths.moduleGallery);
const store = read(paths.store);
const api = read(paths.api);
const types = read(paths.types);
const uploadDto = read(paths.uploadDto);
const hubController = read(paths.hubController);
const hubService = read(paths.hubService);
const documentsDto = read(paths.documentsDto);
const documentsService = read(paths.documentsService);
const packageJson = read(paths.packageJson);
const documentsUploadSlice = [
  sliceBetween(documentsService, 'async upload(', 'async createStoredDocumentMetadata'),
  sliceBetween(documentsService, 'async createStoredDocumentMetadata', 'async updateStatus'),
].join('\n');

const uploadUiSource = [sourcePicker, camera, filePanel, previewGrid, progress, hubUpload].join('\n');
const uploadBusinessSource = [store, api, types, uploadDto, hubController, hubService, documentsDto, documentsService].join('\n');

assert(sourcePicker.includes("store.setUploadSource('camera')"), 'Source picker should expose camera upload.');
assert(sourcePicker.includes("store.setUploadSource('file')"), 'Source picker should expose file upload.');
assert(sourcePicker.includes('Camera') && sourcePicker.includes('FolderOpen'), 'Source picker should use camera and file icons.');

assert(camera.includes('navigator.mediaDevices.getUserMedia'), 'Camera component should use browser getUserMedia.');
assert(camera.includes("ideal: 'environment'"), 'Camera should prefer environment camera.');
assert(camera.includes('audio: false'), 'Camera should not request audio.');
assert(camera.indexOf('navigator.mediaDevices.getUserMedia') > camera.indexOf('async function startCamera'), 'getUserMedia should only be called from user-triggered startCamera.');
assert(camera.includes('capture="environment"'), 'Camera component should provide capture fallback input.');
assert(camera.includes('track.stop()'), 'Camera component should stop MediaStream tracks.');
assert(camera.includes('onBeforeUnmount'), 'Camera component should clean resources on unmount.');
assert(camera.includes('canvas.toBlob') && camera.includes("'image/jpeg'") && camera.includes('0.88'), 'Camera capture should output compressed JPEG with quality 0.88.');
assert(camera.includes('longSide > 2560'), 'Camera capture should cap long edge at 2560px.');
assert(camera.includes('camera-') && camera.includes('safeId'), 'Camera capture should generate safe filenames.');
assert(camera.includes('URL.createObjectURL') && camera.includes('URL.revokeObjectURL'), 'Camera component should manage Object URLs.');
assert(camera.includes('store.addCapturedPhoto'), 'Camera component should add captured photos through the store.');

assert(filePanel.includes('type="file"') && filePanel.includes('multiple'), 'File panel should support multi-file selection.');
assert(filePanel.includes('application/pdf,image/jpeg,image/png,image/webp'), 'File panel should accept PDF and image files.');
assert(filePanel.includes('@drop.prevent'), 'File panel should support drag and drop.');
assert(filePanel.includes('store.addSelectedFiles'), 'File panel should add files through the store.');

assert(previewGrid.includes('store.updateUploadItemMetadata'), 'Preview grid should edit metadata through the store.');
assert(previewGrid.includes('store.removeUploadItem'), 'Preview grid should remove upload items through the store.');
for (const field of ['资料标题', '版本', '关键词', '备注']) {
  assert(previewGrid.includes(field), `Preview grid should show ${field}.`);
}
assert((progress + store).includes('部分资料上传失败') && (progress + store).includes('资料上传成功'), 'Progress component should show real result messages.');

for (const stateName of [
  'uploadContext',
  'uploadSource',
  'uploadFiles',
  'capturedPhotos',
  'uploadItems',
  'uploadProgress',
  'uploadLoading',
  'uploadError',
  'uploadResult',
  'cameraActive',
  'cameraPermission',
]) {
  assert(store.includes(stateName), `Store state ${stateName} should exist.`);
}
for (const actionName of [
  'openModuleUpload',
  'openTopUpload',
  'setUploadSource',
  'addSelectedFiles',
  'addCapturedPhoto',
  'removeUploadItem',
  'updateUploadItemMetadata',
  'uploadAllItems',
  'retryFailedItems',
  'resetUploadState',
]) {
  assert(store.includes(actionName), `Store action ${actionName} should exist.`);
}
assert(store.includes('UPLOAD_ALLOWED_TYPES') && store.includes('UPLOAD_MAX_FILE_SIZE'), 'Store should validate upload type and size.');
assert(store.includes("source: item.source") && store.includes("captureSource: item.captureSource"), 'Store should submit source and captureSource.');
assert(store.includes('await uploadHubDrawingItem'), 'Store should call the real upload API.');
assert(!/manual-\$\{Date\.now\(\)\}|module\.items\.unshift\(nextItem\)|Local fallback below/.test(store), 'Upload failure must not create local fake module items.');

assert(api.includes("formData.append('source'") && api.includes("formData.append('captureSource'"), 'API helper should submit source and captureSource.');
assert(types.includes("'camera_capture'") && types.includes("'manual_upload'"), 'Frontend types should include camera_capture and manual_upload.');
assert(uploadDto.includes("['manual_upload', 'camera_capture']"), 'DocumentHub upload DTO should reject illegal sources.');
assert(uploadDto.includes("['environment_camera']"), 'DocumentHub upload DTO should validate captureSource.');
assert(hubController.includes('source') && hubController.includes('captureSource'), 'DocumentHub controller should document upload source fields.');
assert(hubService.includes("source: dto.source ?? 'manual_upload'"), 'DocumentHub service should pass source to DocumentsService.');
assert(hubService.includes("document.source === 'camera_capture'"), 'DocumentHub service should preserve camera capture in drawing items.');
assert(documentsDto.includes("['manual_upload', 'camera_capture']"), 'Documents upload DTO should reject illegal sources.');
assert(documentsService.includes("source: dto.source ?? 'manual_upload'"), 'Documents service should save upload source.');
assert(documentsService.includes('captureSource: dto.captureSource'), 'Documents service should save captureSource.');

assert(drawingHome.includes('store.openTopUpload()') && drawingHome.includes('@upload="store.openModuleUpload"'), 'Product home should use shared upload entry actions.');
assert(moduleCard.includes("emit('upload', module)"), 'Module cards should use shared module upload event.');
assert(moduleGallery.includes('store.openModuleUpload'), 'Module gallery should use shared module upload action.');
assert(hubUpload.includes('WarmUploadSourcePicker') && hubUpload.includes('WarmCameraCaptureDialog') && hubUpload.includes('WarmFileSelectionPanel'), 'Hub upload dialog should compose the unified upload components.');
assert(hubUpload.includes('store.uploadAllItems') && hubUpload.includes('store.retryFailedItems'), 'Hub upload dialog should use shared store upload actions.');

assert(!/pdf_import|future_wecom|seed/.test(hubUpload + filePanel + camera + previewGrid), 'Upload UI must not let clients forge reserved sources.');
assert(!/manual-\$\{Date\.now\(\)\}|Local fallback below|const nextItem: DrawingItem|module\.items\.unshift\(nextItem\)/.test(store), 'Upload failure must not create local fake module items.');
assert(!/mock fallback|fake success|fake upload/i.test(uploadUiSource + store + api), 'Upload workflow must not fake successful uploads.');
assert(!/new\s+PrismaClient|DATABASE_URL|Sealos|db push|migrate|S3|企业微信微盘/i.test(uploadUiSource + store + api + uploadDto + hubController + hubService + documentsDto + documentsUploadSlice), 'Upload workflow must not connect database, Sealos, S3, or WeCom disk.');

const changed = changedFiles();
const v315PerformanceFiles = [
  'apps/tablet/src/App.vue',
  'apps/tablet/src/main.ts',
  'apps/tablet/src/styles/tablet-performance.css',
  'apps/tablet/src/components/document/WarmImagePreview.vue',
  'apps/tablet/src/components/drawing/WarmImageDetailViewer.vue',
  'apps/tablet/src/components/hub/WarmFunctionOrb.vue',
  'apps/tablet/src/components/hub/WarmHubHeader.vue',
  'apps/tablet/src/components/maintenance/WarmCustomerListPanel.vue',
  'apps/tablet/src/components/maintenance/WarmProductListPanel.vue',
  'apps/tablet/src/components/trash/WarmTrashDocumentCard.vue',
  'scripts/pdf-cover-performance-check.mjs',
  'scripts/tablet-production-performance-smoke.mjs',
  'scripts/tablet-scroll-performance-check.mjs',
  'scripts/tablet-visual-performance-check.mjs',
];
const allowedChangedPrefixes = [
  'apps/tablet/src/components/upload/',
  'apps/tablet/src/components/viewer/',
  'apps/tablet/src/composables/',
  'apps/tablet/src/components/search/',
];
const allowedChangedFiles = new Set([
  paths.hubUpload,
  paths.store,
  paths.api,
  paths.types,
  'apps/api/src/document-hub/dto/drawing-search.dto.ts',
  'apps/tablet/src/app/routes.ts',
  'apps/tablet/src/components/drawing/WarmPdfImportDialog.vue',
  'apps/tablet/src/components/hub/WarmHubSearchBar.vue',
  'apps/tablet/src/lib/drawing-routes.ts',
  'apps/tablet/src/stores/drawing-navigation-store.ts',
  'apps/tablet/src/types/drawing-search.ts',
  'apps/tablet/src/types/product-resolution.ts',
  paths.uploadDto,
  paths.hubController,
  paths.hubService,
  'apps/api/src/document-hub/drawing-metadata.store.ts',
  'apps/api/src/document-hub/helpers/document-lifecycle-validator.ts',
  'apps/api/src/document-hub/mock/document-hub.seed.ts',
  'apps/api/src/document-hub/document-version.service.ts',
  'apps/api/src/document-hub/dto/create-drawing-product.dto.ts',
  'apps/api/src/document-hub/dto/document-metadata.dto.ts',
  'apps/api/src/document-hub/dto/resolve-drawing-product.dto.ts',
  'apps/api/src/document-hub/dto/order-query.dto.ts',
  'apps/api/src/document-hub/dto/order-import.dto.ts',
  'apps/api/src/document-hub/dto/order-maintenance.dto.ts',
  'apps/api/src/document-hub/helpers/order-excel-parser.ts',
  'apps/api/src/document-hub/order-import.service.ts',
  'apps/api/src/document-hub/order-metadata.store.ts',
  'apps/api/src/document-hub/order-status-sync.service.ts',
  'apps/api/src/document-hub/document-hub.module.ts',
  'apps/api/src/document-hub/document-lifecycle.service.ts',
  paths.documentsDto,
  paths.documentsService,
  'apps/api/src/common/enums/production.enum.ts',
  'apps/api/src/common/types/production.types.ts',
  'apps/api/src/repositories/mock/mock-document.repository.ts',
  'apps/api/src/repositories/prisma/prisma-mappers.ts',
  'apps/api/src/migration/mappers/shared.ts',
  'scripts/camera-upload-check.mjs',
  'scripts/drawing-service-store-check.mjs',
  'scripts/real-upload-ui-check.mjs',
  'scripts/pdf-import-frontend-state-check.mjs',
  'scripts/pdf-import-ui-check.mjs',
  'scripts/order-frontend-state-check.mjs',
  'scripts/order-sidebar-layout-check.mjs',
  'scripts/drawing-search-backend-check.mjs',
  'scripts/drawing-search-ui-check.mjs',
  'scripts/drawing-navigation-check.mjs',
  'scripts/tablet-ui-smoke-check.mjs',
  'scripts/document-home-preview-check.mjs',
  'apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue',
  'apps/tablet/src/components/drawing/WarmDocumentActionMenu.vue',
  'apps/tablet/src/components/drawing/WarmEditDocumentDialog.vue',
  'apps/tablet/src/components/drawing/WarmSetEffectiveDialog.vue',
  'apps/tablet/src/components/drawing/WarmDrawingLibraryView.vue',
  'apps/tablet/src/components/drawing/WarmCreateProductArchiveDialog.vue',
  'apps/tablet/src/components/drawing/WarmUnarchivedProductPanel.vue',
  'apps/tablet/src/components/drawing/WarmProductDrawingHome.vue',
  'apps/tablet/src/components/drawing/WarmDrawingModuleGallery.vue',
  'apps/tablet/src/components/drawing/WarmModuleCoverPreview.vue',
  'apps/tablet/src/components/drawing/WarmPdfFirstPagePreview.vue',
  'apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue',
  'apps/tablet/src/components/hub/WarmHubContent.vue',
  'apps/tablet/src/components/orders/WarmOrderCard.vue',
  'apps/tablet/src/components/orders/WarmOrderSidebar.vue',
  'apps/tablet/src/components/trash/WarmDrawingTrashDialog.vue',
  'apps/tablet/src/components/common/WarmAsyncComponentFallback.vue',
  'apps/tablet/src/lib/async-components.ts',
  'apps/tablet/src/lib/document-preview-url.ts',
  'apps/tablet/src/types/document-viewer.ts',
  'apps/tablet/src/types/document-version.ts',
  'scripts/document-viewer-foundation-check.mjs',
  'scripts/document-viewer-thumbnail-check.mjs',
  'scripts/frontend-lazy-loading-check.mjs',
  'scripts/product-detail-cache-check.mjs',
  'scripts/performance-bundle-check.mjs',
  'scripts/document-lifecycle-ui-check.mjs',
  'scripts/document-version-backend-check.mjs',
  'scripts/document-version-ui-check.mjs',
  'scripts/order-product-resolution-check.mjs',
  'scripts/order-metadata-check.mjs',
  'scripts/order-import-backend-check.mjs',
  'scripts/order-status-linkage-check.mjs',
  'docs/order-data-rules-v3.14.2.md',
  '.gitignore',
  paths.packageJson,
  ...v315PerformanceFiles,
]);
for (const file of changed) {
  const allowed = allowedChangedFiles.has(file) || allowedChangedPrefixes.some((prefix) => file.startsWith(prefix));
  assert(allowed, `Unexpected changed file: ${file}`);
}
assert(!changed.some((file) => file.includes('prisma/schema.prisma')), 'Prisma schema must remain unchanged.');
assert(!changed.some((file) => file.includes('/connector/') || file.includes('connector-')), 'Connector files must remain unchanged.');
assert(!changed.some((file) => file.includes('/fixture/') || file.includes('fixture-')), 'Fixture files must remain unchanged.');
assert(!changed.some((file) => /storage\/(uploads|metadata|tmp)\/.+\.json$/.test(file)), 'Runtime storage JSON must not be changed.');
assert(packageJson.includes('"camera-upload:check": "node scripts/camera-upload-check.mjs"'), 'Root package.json should expose camera-upload:check.');

if (blockers.length) {
  console.error('Camera upload check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('Camera upload check passed.');
