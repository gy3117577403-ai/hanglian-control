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
  const result = spawnSync('git', ['status', '--short', '--untracked-files=all'], { cwd: root, encoding: 'utf8' });
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
  documentViewer: 'apps/tablet/src/components/viewer/WarmDocumentViewer.vue',
  toolbar: 'apps/tablet/src/components/viewer/WarmViewerToolbar.vue',
  pdfViewer: 'apps/tablet/src/components/viewer/WarmPdfViewer.vue',
  imageViewer: 'apps/tablet/src/components/viewer/WarmImageViewer.vue',
  rail: 'apps/tablet/src/components/viewer/WarmThumbnailRail.vue',
  pdfThumbnail: 'apps/tablet/src/components/viewer/WarmPdfPageThumbnail.vue',
  imageThumbnail: 'apps/tablet/src/components/viewer/WarmImageThumbnail.vue',
  viewerState: 'apps/tablet/src/composables/use-document-viewer.ts',
  queue: 'apps/tablet/src/composables/use-pdf-thumbnail-queue.ts',
  types: 'apps/tablet/src/types/document-viewer.ts',
  packageJson: 'package.json',
};

for (const relativePath of Object.values(paths)) {
  assert(existsSync(join(root, relativePath)), `${relativePath} should exist.`);
}

const documentViewer = read(paths.documentViewer);
const toolbar = read(paths.toolbar);
const pdfViewer = read(paths.pdfViewer);
const imageViewer = read(paths.imageViewer);
const rail = read(paths.rail);
const pdfThumbnail = read(paths.pdfThumbnail);
const imageThumbnail = read(paths.imageThumbnail);
const viewerState = read(paths.viewerState);
const queue = read(paths.queue);
const types = read(paths.types);
const packageJson = read(paths.packageJson);
const thumbnailSource = [documentViewer, rail, pdfThumbnail, imageThumbnail, queue, types].join('\n');

assert(documentViewer.includes('WarmThumbnailRail'), 'WarmDocumentViewer should mount WarmThumbnailRail.');
assert(documentViewer.includes('shallowRef<PdfDocumentProxy | null>'), 'WarmDocumentViewer should keep a shared PDF document reference.');
assert(documentViewer.includes('@pdf-document="setPdfDocument"'), 'WarmDocumentViewer should receive the PDF document from WarmPdfViewer.');
assert(documentViewer.includes('@select-page="setActivePage"'), 'WarmThumbnailRail should switch PDF pages through the parent viewer.');
assert(documentViewer.includes('@select-item="setActiveItemIndex"'), 'WarmThumbnailRail should switch active documents through the parent viewer.');
assert(documentViewer.includes('thumbnailRailCollapsed'), 'Viewer should keep rail collapsed state only in the current session.');
assert(documentViewer.includes("'rail-collapsed'"), 'Viewer layout should react to collapsed rail state.');
assert(documentViewer.includes('pdfDocument.value = null'), 'Viewer should clear shared PDF references when switching or closing.');

assert(pdfViewer.includes('PdfDocumentReadyPayload'), 'WarmPdfViewer should type the shared PDF document payload.');
assert(pdfViewer.includes('emit(\'pdfDocument\''), 'WarmPdfViewer should emit the loaded PDF document.');
assert(pdfViewer.includes('destroyDocument()') && pdfViewer.includes('document: null'), 'WarmPdfViewer should clear the shared PDF document on destroy.');
assert(pdfViewer.includes('document.getPage(pageNumber)'), 'Main PDF viewer should still render only the active page.');
assert(!/iframe/i.test(pdfViewer), 'Main PDF viewer must not use iframe.');

assert(types.includes('export interface PdfDocumentProxy'), 'Viewer types should expose PdfDocumentProxy.');
assert(types.includes('export interface PdfDocumentReadyPayload'), 'Viewer types should expose PdfDocumentReadyPayload.');
assert(types.includes("export type ThumbnailStatus = 'idle' | 'queued' | 'loading' | 'done' | 'failed'"), 'Viewer types should expose thumbnail statuses.');

assert(queue.includes('maxConcurrent = 2'), 'PDF thumbnail queue should limit concurrency to 2 by default.');
assert(queue.includes('pending') && queue.includes('active'), 'PDF thumbnail queue should keep pending and active jobs.');
assert(queue.includes('AbortController'), 'PDF thumbnail queue should support cancellation.');
assert(queue.includes('cancel(pageNumber') && queue.includes('cancelAll') && queue.includes('reset'), 'PDF thumbnail queue should cancel pages, cancel all, and reset.');
assert(queue.includes('renderedPages'), 'PDF thumbnail queue should cache completed pages in memory only.');
assert(queue.includes('onBeforeUnmount(cancelAll)'), 'PDF thumbnail queue should clean up on unmount.');
assert(!/localStorage|IndexedDB|metadata|Pinia/.test(queue), 'PDF thumbnail queue must not persist cache outside memory.');

assert(rail.includes('usePdfThumbnailQueue(2)'), 'Thumbnail rail should use the PDF thumbnail queue with concurrency 2.');
assert(rail.includes('PrimeSelect'), 'Thumbnail rail should include a document selector.');
assert(rail.includes('option-value="itemId"'), 'Document selector should use item ids internally without displaying them.');
assert(rail.includes('fileTypeLabel') && rail.includes('option.version'), 'Document selector should show title, type, and version.');
assert(rail.includes('WarmPdfPageThumbnail'), 'Thumbnail rail should render PDF page thumbnails.');
assert(rail.includes('WarmImageThumbnail'), 'Thumbnail rail should render image thumbnails.');
assert(rail.includes('mode === \'pdf\'') && rail.includes('mode === \'image\''), 'Thumbnail rail should switch content by active item type.');
assert(rail.includes('scrollIntoView({ block: \'nearest\', inline: \'nearest\', behavior: \'smooth\' })'), 'Thumbnail rail should auto-position active thumbnails.');
assert(rail.includes('manualScrollUntil'), 'Thumbnail rail should avoid forcing scroll while the user is actively scrolling.');
assert(rail.includes('collapsed') && rail.includes('PanelLeftClose') && rail.includes('PanelLeftOpen'), 'Thumbnail rail should be collapsible.');
assert(rail.includes('max-width: 150px') && rail.includes('min-width: 132px'), 'Desktop rail should stay around 130-150px wide.');
assert(rail.includes('@media (max-width: 900px)') && rail.includes('max-height: 132px'), 'Narrow screens should move the rail to a compact bottom layout.');
assert(rail.includes('暂无可预览内容'), 'Thumbnail rail should show an empty state.');
assert(rail.includes('文档页数较多，缩略图将按需加载。'), 'Large PDFs should show an on-demand loading notice.');
assert(rail.includes('queue.reset()') && rail.includes('queue.cancelAll()'), 'Thumbnail rail should reset/cancel thumbnail work when switching or collapsing.');

assert(pdfThumbnail.includes('IntersectionObserver'), 'PDF page thumbnails should render lazily with IntersectionObserver.');
assert(pdfThumbnail.includes('thumbnailScale = 0.22'), 'PDF thumbnails should render at low resolution.');
assert(pdfThumbnail.includes('Math.min(0.25') && pdfThumbnail.includes('Math.max(0.18'), 'PDF thumbnail scale should remain in the low-resolution range.');
assert(pdfThumbnail.includes('props.queue.enqueue'), 'PDF thumbnails should enqueue render work.');
assert(pdfThumbnail.includes('renderTask?.cancel()'), 'PDF thumbnails should cancel render tasks.');
assert(pdfThumbnail.includes('observer?.disconnect()'), 'PDF thumbnails should disconnect observers.');
assert(pdfThumbnail.includes('clearCanvas()'), 'PDF thumbnails should clear canvas resources.');
assert(pdfThumbnail.includes('@click="emit(\'select\', pageNumber)"'), 'PDF thumbnails should be clickable.');
assert(pdfThumbnail.includes('第 {{ pageNumber }} 页预览失败'), 'PDF thumbnails should show page-specific failures.');
assert(pdfThumbnail.includes('retrySeed'), 'PDF thumbnails should support manual retry without infinite retry loops.');
assert(pdfThumbnail.includes(':class="{ active }"'), 'PDF thumbnails should highlight the current page.');

assert(imageThumbnail.includes('resolveDocumentPreviewUrl'), 'Image thumbnails should use the existing preview URL resolver.');
assert(imageThumbnail.includes('loading="lazy"'), 'Image thumbnails should lazy-load images.');
assert(imageThumbnail.includes('object-fit: contain'), 'Image thumbnails should contain images without cropping.');
assert(imageThumbnail.includes('@click="emit(\'select\', index)"'), 'Image thumbnails should be clickable.');
assert(imageThumbnail.includes(':class="{ active }"'), 'Image thumbnails should highlight the current image.');
assert(imageThumbnail.includes('图片预览失败') && imageThumbnail.includes('retrySeed'), 'Image thumbnails should show failure and support retry.');
assert(!/canvas|toDataURL|base64/i.test(imageThumbnail), 'Image thumbnails must not draw images to canvas or create base64 caches.');

assert(viewerState.includes('setActivePage') && viewerState.includes('setActiveItemIndex'), 'Viewer state should expose active page and active item updates.');
assert(toolbar.includes('zoomIn') || toolbar.includes('ZoomIn'), 'Existing toolbar zoom controls should remain present.');
assert(imageViewer.includes('@touchstart.passive') && imageViewer.includes('@touchend.passive'), 'Existing image touch swipe controls should remain present.');

assert(!/storageKey|checksumSha256|checksum|stagedFileKey|\/data\/hanglian|[A-Za-z]:\\/i.test(thumbnailSource), 'Thumbnail UI must not expose storage keys, checksums, or server paths.');
assert(!/new\s+PrismaClient|DATABASE_URL|db push|migrate|Sealos|S3|企业微信微盘/i.test(thumbnailSource), 'Thumbnail work must not connect database, Sealos, S3, or WeCom disk.');
assert(!/fake success|fake preview|mock fallback/i.test(thumbnailSource), 'Thumbnail work must not fake preview success.');
assert(packageJson.includes('"document-viewer-thumbnail:check": "node scripts/document-viewer-thumbnail-check.mjs"'), 'Root package.json should expose document-viewer-thumbnail:check.');

const changed = changedFiles();
const allowedChangedFiles = new Set([
  'apps/tablet/src/app/routes.ts',
  paths.documentViewer,
  paths.toolbar,
  paths.pdfViewer,
  paths.imageViewer,
  paths.rail,
  paths.pdfThumbnail,
  paths.imageThumbnail,
  paths.viewerState,
  paths.queue,
  paths.types,
  'apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue',
  'apps/tablet/src/components/drawing/WarmDrawingModuleGallery.vue',
  'apps/tablet/src/components/drawing/WarmPdfImportDialog.vue',
  'apps/tablet/src/components/drawing/WarmDocumentActionMenu.vue',
  'apps/tablet/src/components/drawing/WarmEditDocumentDialog.vue',
  'apps/tablet/src/components/drawing/WarmSetEffectiveDialog.vue',
  'apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue',
  'apps/tablet/src/components/hub/WarmHubSearchBar.vue',
  'apps/tablet/src/components/orders/WarmOrderCard.vue',
  'apps/tablet/src/lib/drawing-routes.ts',
  'apps/tablet/src/services/api.ts',
  'apps/tablet/src/stores/drawing-navigation-store.ts',
  'apps/tablet/src/stores/document-hub-store.ts',
  'apps/tablet/src/types/production.ts',
  'apps/tablet/src/types/document-version.ts',
  'apps/tablet/src/types/drawing-search.ts',
  'apps/api/src/document-hub/document-hub.controller.ts',
  'apps/api/src/document-hub/document-hub.module.ts',
  'apps/api/src/document-hub/document-hub.service.ts',
  'apps/api/src/document-hub/drawing-metadata.store.ts',
  'apps/api/src/document-hub/helpers/document-lifecycle-validator.ts',
  'apps/api/src/document-hub/mock/document-hub.seed.ts',
  'apps/api/src/document-hub/document-version.service.ts',
  'apps/api/src/document-hub/dto/document-metadata.dto.ts',
  'apps/api/src/document-hub/dto/drawing-search.dto.ts',
  paths.packageJson,
  'scripts/document-viewer-thumbnail-check.mjs',
  'scripts/document-viewer-foundation-check.mjs',
  'scripts/document-home-preview-check.mjs',
  'scripts/drawing-service-store-check.mjs',
  'scripts/camera-upload-check.mjs',
  'scripts/pdf-import-frontend-state-check.mjs',
  'scripts/pdf-import-ui-check.mjs',
  'scripts/order-frontend-state-check.mjs',
  'scripts/order-sidebar-layout-check.mjs',
  'scripts/document-version-backend-check.mjs',
  'scripts/document-version-ui-check.mjs',
  'scripts/document-lifecycle-ui-check.mjs',
  'scripts/drawing-search-backend-check.mjs',
  'scripts/drawing-search-ui-check.mjs',
  'scripts/drawing-navigation-check.mjs',
]);
const allowedChangedPrefixes = [
  'apps/tablet/src/components/viewer/',
  'apps/tablet/src/composables/',
  'apps/tablet/src/components/search/',
];
for (const file of changed) {
  const allowed = allowedChangedFiles.has(file) || allowedChangedPrefixes.some((prefix) => file.startsWith(prefix));
  assert(allowed, `Unexpected changed file: ${file}`);
}
assert(!changed.some((file) => file.startsWith('apps/api/') && !allowedChangedFiles.has(file)), 'Backend changes must be limited to document version metadata management.');
assert(!changed.some((file) => file.includes('prisma/schema.prisma')), 'Prisma schema must remain unchanged.');
assert(!changed.some((file) => file.includes('/connector/') || file.includes('connector-')), 'Connector files must remain unchanged.');
assert(!changed.some((file) => file.includes('/fixture/') || file.includes('fixture-')), 'Fixture files must remain unchanged.');
assert(!changed.some((file) => /storage\/(uploads|metadata|tmp)\//.test(file)), 'Runtime storage files must remain unchanged.');

if (blockers.length) {
  console.error('Document viewer thumbnail check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('Document viewer thumbnail check passed.');
