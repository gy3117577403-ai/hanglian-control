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
    .map((line) => line.includes(' -> ') ? line.split(' -> ').pop() ?? line : line)
    .map((line) => line.replaceAll('\\', '/'));
}

const paths = {
  dashboard: 'apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue',
  header: 'apps/tablet/src/components/hub/WarmHubHeader.vue',
  dialog: 'apps/tablet/src/components/drawing/WarmPdfImportDialog.vue',
  filePanel: 'apps/tablet/src/components/drawing/WarmPdfImportFilePanel.vue',
  previewTable: 'apps/tablet/src/components/drawing/WarmPdfImportPreviewTable.vue',
  result: 'apps/tablet/src/components/drawing/WarmPdfImportResult.vue',
  packageJson: 'package.json',
};

for (const [name, relativePath] of Object.entries(paths)) {
  assert(existsSync(join(root, relativePath)), `${name} should exist at ${relativePath}.`);
}
assert(existsSync(join(root, 'scripts/pdf-import-ui-check.mjs')), 'UI check script should exist.');

const dashboard = read(paths.dashboard);
const header = read(paths.header);
const dialog = read(paths.dialog);
const filePanel = read(paths.filePanel);
const previewTable = read(paths.previewTable);
const result = read(paths.result);
const packageJson = read(paths.packageJson);
const uiSource = [dashboard, header, dialog, filePanel, previewTable, result].join('\n');
const uploadPhasePaths = [
  'apps/tablet/src/components/hub/WarmHubUploadDialog.vue',
  'apps/tablet/src/components/upload/WarmUploadSourcePicker.vue',
  'apps/tablet/src/components/upload/WarmCameraCaptureDialog.vue',
  'apps/tablet/src/components/upload/WarmFileSelectionPanel.vue',
  'apps/tablet/src/components/upload/WarmUploadPreviewGrid.vue',
  'apps/tablet/src/components/upload/WarmUploadProgress.vue',
  'apps/tablet/src/services/api.ts',
  'apps/tablet/src/stores/document-hub-store.ts',
  'apps/tablet/src/types/production.ts',
  'apps/api/src/common/enums/production.enum.ts',
  'apps/api/src/common/types/production.types.ts',
  'apps/api/src/document-hub/document-hub.controller.ts',
  'apps/api/src/document-hub/document-hub.service.ts',
  'apps/api/src/document-hub/dto/create-drawing-product.dto.ts',
  'apps/api/src/document-hub/dto/update-drawing-product.dto.ts',
  'apps/api/src/document-hub/dto/resolve-drawing-product.dto.ts',
  'apps/api/src/document-hub/dto/upload-drawing-item.dto.ts',
  'apps/api/src/documents/documents.service.ts',
  'apps/api/src/documents/dto/upload-document.dto.ts',
  'apps/api/src/migration/mappers/shared.ts',
  'apps/api/src/repositories/mock/mock-document.repository.ts',
  'apps/api/src/repositories/prisma/prisma-mappers.ts',
  'scripts/camera-upload-check.mjs',
  'scripts/real-upload-ui-check.mjs',
  'scripts/order-product-resolution-check.mjs',
  'scripts/tablet-ui-smoke-check.mjs',
  'apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue',
  'apps/tablet/src/components/drawing/WarmDrawingLibraryView.vue',
  'apps/tablet/src/components/drawing/WarmCreateProductArchiveDialog.vue',
  'apps/tablet/src/components/drawing/WarmUnarchivedProductPanel.vue',
  'apps/tablet/src/components/drawing/WarmProductDrawingHome.vue',
  'apps/tablet/src/components/drawing/WarmDrawingModuleGallery.vue',
  'apps/tablet/src/components/drawing/WarmModuleCoverPreview.vue',
  'apps/tablet/src/components/drawing/WarmPdfFirstPagePreview.vue',
  'apps/tablet/src/lib/document-preview-url.ts',
  'apps/tablet/src/types/document-viewer.ts',
  'apps/tablet/src/types/product-resolution.ts',
  'apps/tablet/src/types/customer-product-maintenance.ts',
  'apps/tablet/src/components/maintenance/WarmCustomerProductMaintenanceDialog.vue',
  'apps/tablet/src/components/maintenance/WarmCustomerListPanel.vue',
  'apps/tablet/src/components/maintenance/WarmProductListPanel.vue',
  'apps/tablet/src/components/maintenance/WarmCustomerEditDialog.vue',
  'apps/tablet/src/components/maintenance/WarmProductEditDialog.vue',
  'scripts/customer-product-maintenance-check.mjs',
  'scripts/document-home-preview-check.mjs',
  'scripts/document-viewer-foundation-check.mjs',
  'scripts/document-viewer-thumbnail-check.mjs',
];
const uploadPhasePrefixes = [
  'apps/tablet/src/components/upload/',
  'apps/tablet/src/components/viewer/',
  'apps/tablet/src/composables/',
];
const drawingSearchPrefixes = [
  'apps/tablet/src/components/search/',
];

assert(header.includes("'open-pdf-import'"), 'Header should emit open-pdf-import.');
assert(header.includes("store.activeMode === 'drawing'"), 'PDF import entry should only show in drawing mode.');
assert(header.includes('导入 PDF 图纸'), 'PDF import button label should be visible.');
assert(header.includes('PrimeButton'), 'PDF import entry should use PrimeButton.');
assert(!header.includes('connector') && !header.includes('fixture'), 'Header entry should not add connector or fixture logic.');

assert(dashboard.includes('WarmPdfImportDialog'), 'Dashboard should mount WarmPdfImportDialog.');
assert(dashboard.includes('@open-pdf-import'), 'Dashboard should listen to open-pdf-import.');
assert(
  dashboard.includes('v-model:visible="pdfImportOpen"') || dashboard.includes('v-model:visible="store.pdfImportDialogOpen"'),
  'Dashboard should control PDF import dialog visibility.',
);

assert(dialog.includes('PrimeDialog'), 'Import dialog should use PrimeDialog.');
assert(dialog.includes('useConfirm'), 'Import dialog should use PrimeVue ConfirmDialog.');
assert(dialog.includes('选择文件') && dialog.includes('确认信息') && dialog.includes('导入结果'), 'Dialog should expose three stages.');
assert(dialog.includes('store.previewPdfImport()'), 'Preview button should call store.previewPdfImport().');
assert(dialog.includes('store.applyPdfImport()'), 'Apply confirmation should call store.applyPdfImport().');
assert(dialog.includes('store.pdfImportApplyLoading'), 'Dialog should guard Apply loading state.');
assert(dialog.includes('PDF 导入预览已过期，请重新选择文件。'), 'Dialog should show expired preview message.');
assert(dialog.includes('错误或重复文件不能选择导入。'), 'Dialog should prevent error or duplicate rows from applying.');
assert(dialog.includes('store.loadCustomers()'), 'Finish should refresh customers.');

assert(filePanel.includes('PrimeSelect'), 'File panel should include customer selection.');
assert(filePanel.includes('filter'), 'Customer selection should support searching.');
assert(filePanel.includes('type="file"') && filePanel.includes('multiple'), 'File panel should support multi PDF selection.');
assert(filePanel.includes('data-pdf-dropzone'), 'File panel should include a drop zone.');
assert(filePanel.includes('store.setPdfImportFiles'), 'File panel should write selected files through the store.');
assert(filePanel.includes('仅支持 PDF 图纸文件。'), 'File panel should validate PDF type.');
assert(filePanel.includes('文件超过 30 MB'), 'File panel should validate single file size.');
assert(filePanel.includes('单次最多选择 50 个 PDF 文件。'), 'File panel should validate file count.');
assert(filePanel.includes('300 MB'), 'File panel should validate total file size.');
assert(filePanel.includes('已忽略重复选择的文件。'), 'File panel should show duplicate selection notice.');

assert(previewTable.includes('PrimeDataTable'), 'Preview table should use PrimeDataTable.');
assert(previewTable.includes('store.updatePdfImportItem'), 'Preview table should update rows through store.updatePdfImportItem().');
assert(previewTable.includes('confirmedProductModel'), 'Preview table should edit confirmed product model.');
assert(previewTable.includes('confirmedVersion'), 'Preview table should edit confirmed version.');
assert(previewTable.includes('productName'), 'Preview table should support new product name.');
assert(previewTable.includes('setAsEffective'), 'Preview table should support set as effective option.');
assert(previewTable.includes("item.action !== 'error'") && previewTable.includes("item.action !== 'skip_duplicate'"), 'Preview table should disable error and duplicate row selection.');
assert(previewTable.includes('新建产品') && previewTable.includes('新增原图版本') && previewTable.includes('相同文件，跳过'), 'Preview table should map actions to Chinese labels.');
assert(!previewTable.includes('{{ data.action }}'), 'Preview table should not display raw action values.');

assert(result.includes('partially_applied'), 'Result should have independent partial success display.');
assert(result.includes('全部完成') && result.includes('部分完成') && result.includes('导入失败'), 'Result should display all status labels.');
assert(result.includes('created_product') && result.includes('added_version') && result.includes('skipped_duplicate'), 'Result should map Apply result values.');
assert(result.includes("'open-product'"), 'Result should expose open product action.');
assert(result.includes('查看产品'), 'Result should show product entry when available.');

assert(!/stagedFileKey|checksumSha256|checksum|[A-Za-z]:\\|\/data\/hanglian/i.test(uiSource), 'UI must not display staged keys, checksums, or absolute server paths.');
assert(!/测试上传|本机测试护栏|测试护栏|HL_REAL_DATA_TEST/i.test(uiSource), 'PDF import UI must not contain test guard copy.');
assert(!/mock fallback|fake success|fake preview/i.test(uiSource), 'PDF import UI must not fake Preview or Apply success.');
assert(!/new\s+PrismaClient|DATABASE_URL|Sealos|db push|migrate/i.test(uiSource), 'PDF import UI must not connect database or Sealos.');

const changed = changedFiles();
const v315PerformanceFiles = [
  'apps/tablet/src/App.vue',
  'apps/tablet/src/main.ts',
  'apps/tablet/src/styles/tablet-performance.css',
  'apps/tablet/src/components/document/WarmImagePreview.vue',
  'apps/tablet/src/components/drawing/WarmImageDetailViewer.vue',
  'apps/tablet/src/components/hub/WarmFunctionOrb.vue',
  'apps/tablet/src/components/trash/WarmTrashDocumentCard.vue',
  'scripts/pdf-cover-performance-check.mjs',
  'scripts/tablet-production-performance-smoke.mjs',
  'scripts/tablet-scroll-performance-check.mjs',
  'scripts/tablet-visual-performance-check.mjs',
];
const v316AndroidFoundationFiles = [
  '.gitignore',
  'README.md',
  'package.json',
  'package-lock.json',
  'apps/tablet/.env.android.example',
  'apps/tablet/capacitor.config.ts',
  'apps/tablet/package.json',
  'apps/tablet/src/App.vue',
  'apps/tablet/src/components/native/WarmNativeNetworkBanner.vue',
  'apps/tablet/src/components/warm/WarmStatusBar.vue',
  'apps/tablet/src/config/api-base.ts',
  'apps/tablet/src/main.ts',
  'apps/tablet/src/native/android-back-handler.ts',
  'apps/tablet/src/native/native-network.ts',
  'apps/tablet/src/native/native-platform.ts',
  'apps/tablet/src/native/native-shell.ts',
  'apps/tablet/src/services/api.ts',
  'apps/tablet/src/style.css',
  'apps/tablet/vite.config.ts',
  'docs/android-debug-install-guide.md',
  'docs/project-status.md',
  'docs/v3.16-android-app-foundation.md',
  'scripts/android-app-foundation-check.mjs',
  'scripts/android-back-navigation-check.mjs',
  'scripts/android-gradle.mjs',
  'scripts/native-api-config-check.mjs',
  'scripts/native-network-check.mjs',
];
const v316NativeConnectorFiles = [
  'apps/tablet/src/components/connector/WarmConnectorDetailDialog.vue',
  'apps/tablet/src/components/connector/WarmConnectorParameterView.vue',
  'apps/tablet/src/components/connector/WarmConnectorTable.vue',
  'apps/tablet/src/composables/use-native-viewport.ts',
  'apps/tablet/src/stores/document-hub-store.ts',
  'scripts/android-app-foundation-check.mjs',
  'scripts/frontend-lazy-loading-check.mjs',
  'scripts/native-connector-layout-check.mjs',
  'scripts/native-connector-scroll-check.mjs',
];
const allowedChanges = new Set([
  paths.dashboard,
  paths.header,
  paths.dialog,
  paths.filePanel,
  paths.previewTable,
  paths.result,
  'scripts/pdf-import-ui-check.mjs',
  'scripts/pdf-import-frontend-state-check.mjs',
  'scripts/drawing-service-store-check.mjs',
  'apps/tablet/src/components/orders/WarmOrderCard.vue',
  'apps/api/src/document-hub/dto/drawing-search.dto.ts',
  'apps/tablet/src/app/routes.ts',
  'apps/tablet/src/components/hub/WarmHubSearchBar.vue',
  'apps/tablet/src/components/hub/WarmHubContent.vue',
  'apps/tablet/src/lib/drawing-routes.ts',
  'apps/tablet/src/lib/async-components.ts',
  'apps/tablet/src/stores/drawing-navigation-store.ts',
  'apps/tablet/src/types/drawing-search.ts',
  'apps/tablet/src/components/common/WarmAsyncComponentFallback.vue',
  'scripts/document-lifecycle-ui-check.mjs',
  'scripts/order-frontend-state-check.mjs',
  'scripts/order-sidebar-layout-check.mjs',
  'scripts/security-check.mjs',
  'scripts/drawing-search-backend-check.mjs',
  'scripts/drawing-search-ui-check.mjs',
  'scripts/drawing-navigation-check.mjs',
  'scripts/frontend-lazy-loading-check.mjs',
  'scripts/product-detail-cache-check.mjs',
  'scripts/performance-bundle-check.mjs',
  'apps/tablet/src/components/orders/WarmOrderSidebar.vue',
  'apps/tablet/src/components/trash/WarmDrawingTrashDialog.vue',
  ...uploadPhasePaths,
  paths.packageJson,
  ...v315PerformanceFiles,
  ...v316AndroidFoundationFiles,
  ...v316NativeConnectorFiles,
]);
for (const file of changed) {
  const allowedByPrefix = uploadPhasePrefixes.some((prefix) => file.startsWith(prefix));
  const allowedBySearchPrefix = drawingSearchPrefixes.some((prefix) => file.startsWith(prefix));
  const allowedByAndroidPrefix = file.startsWith('apps/tablet/android/');
  const allowedByNativePrefix = file.startsWith('apps/tablet/src/components/native/') || file.startsWith('apps/tablet/src/native/');
  assert(allowedChanges.has(file) || allowedByPrefix || allowedBySearchPrefix || allowedByAndroidPrefix || allowedByNativePrefix, `Unexpected changed file: ${file}`);
}
assert(!changed.some((file) => file.startsWith('apps/api/') && !uploadPhasePaths.includes(file) && !allowedChanges.has(file)), 'Unexpected backend files must remain unchanged.');
assert(!changed.some((file) => file.includes('prisma/') && !uploadPhasePaths.includes(file) && !allowedChanges.has(file)), 'Unexpected Prisma files must remain unchanged.');
assert(!changed.some((file) => file.includes('/connector/') && !v316NativeConnectorFiles.includes(file)), 'Connector components must remain unchanged.');
assert(!changed.some((file) => file.includes('/fixture/')), 'Fixture components must remain unchanged.');
assert(packageJson.includes('"pdf-import-ui:check": "node scripts/pdf-import-ui-check.mjs"'), 'Root package.json should expose pdf-import-ui:check.');

if (blockers.length) {
  console.error('PDF import UI check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('PDF import UI check passed.');
