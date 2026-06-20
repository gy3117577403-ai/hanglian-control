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

function loadUrlHelperForTest(apiBaseUrl) {
  const source = read(paths.urlHelper)
    .replace(/import[^\n]+getApiBaseUrl[^\n]+\n/, '')
    .replaceAll('export function', 'function')
    .replaceAll('?: string | null', '');
  // eslint-disable-next-line no-new-func
  return new Function('getApiBaseUrl', `${source}; return { resolveDocumentPreviewUrl, resolveDocumentDownloadUrl };`)(() => apiBaseUrl);
}

const paths = {
  moduleCard: 'apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue',
  moduleCover: 'apps/tablet/src/components/drawing/WarmModuleCoverPreview.vue',
  pdfFirstPage: 'apps/tablet/src/components/drawing/WarmPdfFirstPagePreview.vue',
  urlHelper: 'apps/tablet/src/lib/document-preview-url.ts',
  types: 'apps/tablet/src/types/production.ts',
  packageJson: 'package.json',
  script: 'scripts/document-home-preview-check.mjs',
};

for (const relativePath of Object.values(paths)) {
  assert(existsSync(join(root, relativePath)), `${relativePath} should exist.`);
}

const moduleCard = read(paths.moduleCard);
const moduleCover = read(paths.moduleCover);
const pdfFirstPage = read(paths.pdfFirstPage);
const urlHelper = read(paths.urlHelper);
const types = read(paths.types);
const packageJson = read(paths.packageJson);
const uiSource = [moduleCard, moduleCover, pdfFirstPage].join('\n');

assert(moduleCard.includes('WarmModuleCoverPreview'), 'WarmDrawingModuleCard should render the unified module cover preview.');
assert(moduleCard.includes('selectModuleCoverItem'), 'Module cover selection should be centralized in a helper/computed path.');
assert(moduleCard.includes('filter((item) => !isDeleted(item))'), 'Module cover selection must filter deleted items.');
assert(moduleCard.includes('isEffective'), 'Module cover selection must prefer effective documents.');
assert(moduleCard.includes('manual_upload') && moduleCard.includes('camera_capture') && moduleCard.includes('pdf_import'), 'Module cover selection must prefer real upload/import sources.');
assert(moduleCard.includes('coverDocumentId'), 'Module cover selection must honor coverDocumentId when available.');
assert(moduleCard.includes('activeItems.length'), 'Module card should count active, undeleted items.');
assert(moduleCard.includes('imageCount'), 'Module card should calculate image counts.');
assert(moduleCard.includes('height: 420px') && moduleCard.includes('height: 360px'), 'Module cards should keep fixed heights.');
assert(moduleCard.includes(`@click="emit('upload', module)"`), 'Upload button logic should remain wired to the existing module upload event.');
assert(moduleCard.includes(`@click="emit('delete', module)"`), 'Delete button logic should remain wired to the existing delete event.');

assert(moduleCover.includes('WarmPdfFirstPagePreview'), 'WarmModuleCoverPreview should delegate PDFs to the first-page PDF component.');
assert(moduleCover.includes('resolveDocumentPreviewUrl'), 'WarmModuleCoverPreview should use the preview URL resolver.');
assert(moduleCover.includes('loading=\"lazy\"'), 'Image covers should use lazy loading.');
assert(moduleCover.includes('object-fit: contain'), 'Image covers should use object-fit: contain.');
assert(moduleCover.includes('图片预览失败'), 'Image cover should expose a real failure state.');
assert(moduleCover.includes('暂无资料') && moduleCover.includes('暂无原图'), 'Module cover should expose empty states.');
assert(moduleCover.includes('共 ${props.imageCount} 张') && moduleCover.includes('1 张'), 'Image cover should display single and multi-image counts.');
assert(moduleCover.includes('textSummary') && moduleCover.includes('-webkit-line-clamp: 4'), 'Text/card covers should show a bounded summary.');
assert(!moduleCover.includes('图片预览占位'), 'Module cover must not show image placeholder copy.');
assert(!moduleCover.includes('PDF 预览占位'), 'Module cover must not show PDF placeholder copy.');

assert(pdfFirstPage.includes('pdfjs-dist/build/pdf.mjs?url'), 'WarmPdfFirstPagePreview should use the existing pdfjs-dist browser build.');
assert(pdfFirstPage.includes('document.getPage(1)'), 'PDF preview must render only the first page.');
assert(pdfFirstPage.includes('IntersectionObserver'), 'PDF preview must use IntersectionObserver.');
assert(pdfFirstPage.includes('PrimeSkeleton'), 'PDF preview should show a loading skeleton.');
assert(pdfFirstPage.includes('numPages'), 'PDF preview should read total page count.');
assert(pdfFirstPage.includes('共 ${pageCount.value} 页') && pdfFirstPage.includes('1 页'), 'PDF preview should show total page count labels.');
assert(pdfFirstPage.includes('PDF 预览失败'), 'PDF preview should expose a real failure state.');
assert(pdfFirstPage.includes('retryKey') && pdfFirstPage.includes('重试'), 'PDF preview should provide manual retry.');
assert(pdfFirstPage.includes('onBeforeUnmount') && pdfFirstPage.includes('cancelRender()'), 'PDF preview should release observer/load state and cancel rendering on unmount.');
assert(!/iframe/i.test(pdfFirstPage), 'PDF first-page preview must not use iframe as the main implementation.');
assert(!/Buffer/.test(pdfFirstPage + moduleCover + moduleCard), 'Product module covers must not store PDF Buffer data.');

assert(urlHelper.includes('getApiBaseUrl'), 'Preview URL helper should use the runtime API base.');
assert(urlHelper.includes('resolveDocumentPreviewUrl'), 'Preview URL helper should export resolveDocumentPreviewUrl.');
assert(urlHelper.includes('resolveDocumentDownloadUrl'), 'Preview URL helper should export resolveDocumentDownloadUrl.');
assert(urlHelper.includes('api\\/api\\/files') || urlHelper.includes('/api/api/files'), 'Preview URL helper should explicitly guard repeated /api.');

const helper = loadUrlHelperForTest('https://api-domain.example/api');
const previewCases = [
  ['/api/files/documents/123/preview', 'https://api-domain.example/api/files/documents/123/preview'],
  ['/files/documents/123/preview', 'https://api-domain.example/api/files/documents/123/preview'],
  ['https://cdn.example/documents/123/preview', 'https://cdn.example/documents/123/preview'],
  ['', ''],
];
for (const [input, expected] of previewCases) {
  assert(helper.resolveDocumentPreviewUrl(input) === expected, `Preview URL ${input || '<empty>'} should resolve to ${expected || '<empty>'}.`);
}
assert(!helper.resolveDocumentPreviewUrl('/api/files/documents/123/preview').includes('/api/api/'), 'Preview URL helper must not produce /api/api.');
assert(helper.resolveDocumentDownloadUrl('/files/documents/123/download') === 'https://api-domain.example/api/files/documents/123/download', 'Download URL helper should resolve relative file URLs against API origin.');

assert(types.includes('coverDocumentId?: string'), 'DrawingModule type should include optional coverDocumentId.');
assert(types.includes('pageCount?: number'), 'DrawingItem type should include optional pageCount.');
assert(types.includes('deletedAt?: string'), 'DrawingItem type should include optional deletedAt.');

assert(packageJson.includes('"document-home-preview:check": "node scripts/document-home-preview-check.mjs"'), 'Root package.json should expose document-home-preview:check.');

const changed = changedFiles();
const allowedChangedPrefixes = [
  'apps/tablet/src/components/viewer/',
  'apps/tablet/src/composables/',
];
const allowedChanged = new Set([
  paths.moduleCard,
  paths.moduleCover,
  paths.pdfFirstPage,
  paths.urlHelper,
  paths.types,
  paths.packageJson,
  paths.script,
  'apps/tablet/src/components/drawing/WarmDrawingLibraryView.vue',
  'apps/tablet/src/components/drawing/WarmProductDrawingHome.vue',
  'apps/tablet/src/components/drawing/WarmDrawingModuleGallery.vue',
  'apps/tablet/src/stores/document-hub-store.ts',
  'apps/tablet/src/types/document-viewer.ts',
  'scripts/document-viewer-foundation-check.mjs',
  'scripts/camera-upload-check.mjs',
  'scripts/pdf-import-ui-check.mjs',
]);
for (const file of changed) {
  const allowed = allowedChanged.has(file) || allowedChangedPrefixes.some((prefix) => file.startsWith(prefix));
  assert(allowed, `Unexpected changed file: ${file}`);
}
assert(!changed.some((file) => file.startsWith('apps/api/')), 'Backend files must remain unchanged.');
assert(!changed.some((file) => file.includes('prisma/schema.prisma')), 'Prisma schema must remain unchanged.');
assert(!changed.some((file) => file.includes('/connector/') || file.includes('connector-')), 'Connector files must remain unchanged.');
assert(!changed.some((file) => file.includes('/fixture/') || file.includes('fixture-')), 'Fixture files must remain unchanged.');
assert(!/new\s+PrismaClient|DATABASE_URL|db push|migrate|seed|Sealos|S3|企业微信微盘/i.test(uiSource + urlHelper), 'Home preview work must not connect database, Sealos, S3, or WeCom disk.');

if (blockers.length) {
  console.error('Document home preview check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('Document home preview check passed.');
