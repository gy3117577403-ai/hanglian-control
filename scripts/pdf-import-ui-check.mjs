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
  'apps/api/src/document-hub/dto/upload-drawing-item.dto.ts',
  'apps/api/src/documents/documents.service.ts',
  'apps/api/src/documents/dto/upload-document.dto.ts',
  'apps/api/src/migration/mappers/shared.ts',
  'apps/api/src/repositories/mock/mock-document.repository.ts',
  'apps/api/src/repositories/prisma/prisma-mappers.ts',
  'scripts/camera-upload-check.mjs',
  'scripts/real-upload-ui-check.mjs',
  'scripts/tablet-ui-smoke-check.mjs',
  'apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue',
  'apps/tablet/src/components/drawing/WarmDrawingLibraryView.vue',
  'apps/tablet/src/components/drawing/WarmProductDrawingHome.vue',
  'apps/tablet/src/components/drawing/WarmDrawingModuleGallery.vue',
  'apps/tablet/src/components/drawing/WarmModuleCoverPreview.vue',
  'apps/tablet/src/components/drawing/WarmPdfFirstPagePreview.vue',
  'apps/tablet/src/lib/document-preview-url.ts',
  'apps/tablet/src/types/document-viewer.ts',
  'scripts/document-home-preview-check.mjs',
  'scripts/document-viewer-foundation-check.mjs',
];
const uploadPhasePrefixes = [
  'apps/tablet/src/components/upload/',
  'apps/tablet/src/components/viewer/',
  'apps/tablet/src/composables/',
];

assert(header.includes("'open-pdf-import'"), 'Header should emit open-pdf-import.');
assert(header.includes("store.activeMode === 'drawing'"), 'PDF import entry should only show in drawing mode.');
assert(header.includes('导入 PDF 图纸'), 'PDF import button label should be visible.');
assert(header.includes('PrimeButton'), 'PDF import entry should use PrimeButton.');
assert(!header.includes('connector') && !header.includes('fixture'), 'Header entry should not add connector or fixture logic.');

assert(dashboard.includes('WarmPdfImportDialog'), 'Dashboard should mount WarmPdfImportDialog.');
assert(dashboard.includes('@open-pdf-import'), 'Dashboard should listen to open-pdf-import.');
assert(dashboard.includes('v-model:visible="pdfImportOpen"'), 'Dashboard should control PDF import dialog visibility.');

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
const allowedChanges = new Set([
  paths.dashboard,
  paths.header,
  paths.dialog,
  paths.filePanel,
  paths.previewTable,
  paths.result,
  'scripts/pdf-import-ui-check.mjs',
  'scripts/pdf-import-frontend-state-check.mjs',
  ...uploadPhasePaths,
  paths.packageJson,
]);
for (const file of changed) {
  const allowedByPrefix = uploadPhasePrefixes.some((prefix) => file.startsWith(prefix));
  assert(allowedChanges.has(file) || allowedByPrefix, `Unexpected changed file: ${file}`);
}
assert(!changed.some((file) => file.startsWith('apps/api/') && !uploadPhasePaths.includes(file)), 'Unexpected backend files must remain unchanged.');
assert(!changed.some((file) => file.includes('prisma/') && !uploadPhasePaths.includes(file)), 'Unexpected Prisma files must remain unchanged.');
assert(!changed.some((file) => file.includes('/connector/')), 'Connector components must remain unchanged.');
assert(!changed.some((file) => file.includes('/fixture/')), 'Fixture components must remain unchanged.');
assert(packageJson.includes('"pdf-import-ui:check": "node scripts/pdf-import-ui-check.mjs"'), 'Root package.json should expose pdf-import-ui:check.');

if (blockers.length) {
  console.error('PDF import UI check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('PDF import UI check passed.');
