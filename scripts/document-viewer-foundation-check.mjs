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
  library: 'apps/tablet/src/components/drawing/WarmDrawingLibraryView.vue',
  productHome: 'apps/tablet/src/components/drawing/WarmProductDrawingHome.vue',
  moduleCard: 'apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue',
  moduleGallery: 'apps/tablet/src/components/drawing/WarmDrawingModuleGallery.vue',
  viewer: 'apps/tablet/src/components/viewer/WarmDocumentViewer.vue',
  toolbar: 'apps/tablet/src/components/viewer/WarmViewerToolbar.vue',
  pdfViewer: 'apps/tablet/src/components/viewer/WarmPdfViewer.vue',
  imageViewer: 'apps/tablet/src/components/viewer/WarmImageViewer.vue',
  composable: 'apps/tablet/src/composables/use-document-viewer.ts',
  viewerTypes: 'apps/tablet/src/types/document-viewer.ts',
  store: 'apps/tablet/src/stores/document-hub-store.ts',
  urlHelper: 'apps/tablet/src/lib/document-preview-url.ts',
  packageJson: 'package.json',
};

for (const relativePath of Object.values(paths)) {
  assert(existsSync(join(root, relativePath)), `${relativePath} should exist.`);
}

const library = read(paths.library);
const productHome = read(paths.productHome);
const moduleCard = read(paths.moduleCard);
const moduleGallery = read(paths.moduleGallery);
const viewer = read(paths.viewer);
const toolbar = read(paths.toolbar);
const pdfViewer = read(paths.pdfViewer);
const imageViewer = read(paths.imageViewer);
const composable = read(paths.composable);
const viewerTypes = read(paths.viewerTypes);
const store = read(paths.store);
const urlHelper = read(paths.urlHelper);
const packageJson = read(paths.packageJson);
const viewerSource = [viewer, toolbar, pdfViewer, imageViewer, composable, viewerTypes, urlHelper].join('\n');

assert(library.includes('WarmDocumentViewer'), 'Drawing library should mount the unified document viewer.');
assert(library.includes('documentViewerOpen'), 'Drawing library should bind the viewer visible state.');
assert(library.includes('documentViewerInitialItemId'), 'Drawing library should pass the initial viewer item.');
assert(library.includes('@close="store.closeDocumentViewer"'), 'Drawing library should restore state on viewer close.');

assert(moduleCard.includes('preview: [module: DrawingModule, item?: DrawingItem | null]'), 'Module card should expose a preview event with the cover item.');
assert(moduleCard.includes("@open=\"emit('preview', module, coverItem)\""), 'Module cover click should open the unified viewer.');
assert(moduleCard.includes("@click=\"emit('preview', module, coverItem)\""), 'View-all action should open the unified viewer.');
assert(moduleCard.includes("emit('upload', module)") && moduleCard.includes("emit('delete', module)"), 'Upload and delete module card actions should stay wired.');
assert(productHome.includes('@preview="store.openModuleViewer"'), 'Product home should route preview actions to the unified viewer.');
assert(moduleGallery.includes('store.openImageDetail(item)'), 'Module gallery item clicks should keep using the compatible detail entry.');

for (const token of [
  'documentViewerOpen',
  'documentViewerInitialItemId',
  'openModuleViewer',
  'closeDocumentViewer',
  'selectViewerInitialItem',
  'coverDocumentId',
  'manual_upload',
  'camera_capture',
  'pdf_import',
]) {
  assert(store.includes(token), `Store should include ${token}.`);
}
assert(store.includes('openImageDetail(item: DrawingItem)') && store.includes('openModuleViewer(selectedModule.value, item)'), 'openImageDetail should delegate to the unified viewer while preserving the public method name.');
assert(store.includes('await restoreScroll(documentViewerReturnLevel.value)'), 'Closing the viewer should restore the previous scroll position.');
assert(store.includes("if (documentViewerReturnLevel.value === 'product') selectedModule.value = null"), 'Closing from product home should clear the temporary selected module.');

assert(viewerTypes.includes("export type ViewerMode = 'pdf' | 'image' | 'text' | 'unsupported'"), 'Viewer types should define supported modes.');
assert(viewerTypes.includes("export type ViewerFitMode = 'actual' | 'width' | 'page'"), 'Viewer types should define fit modes.');
assert(viewerTypes.includes('export interface ViewerState'), 'Viewer types should define ViewerState.');

assert(composable.includes('const minZoom = 0.5') && composable.includes('const maxZoom = 3') && composable.includes('const zoomStep = 0.25'), 'Viewer zoom bounds should be 50% to 300% in 25% steps.');
assert(composable.includes("fitMode = 'width'") && composable.includes("fitMode = 'page'"), 'Viewer composable should support fit width and fit page.');
assert(composable.includes('state.zoom = 1') && composable.includes('state.fitMode = \'actual\''), 'Viewer reset should return to 100%.');
assert(composable.includes('state.rotation = (state.rotation + 90) % 360'), 'Viewer should rotate clockwise.');
assert(composable.includes('state.rotation = (state.rotation + 270) % 360'), 'Viewer should rotate counterclockwise.');
assert(composable.includes('previousItem') && composable.includes('nextItem'), 'Viewer should move between files.');
assert(composable.includes('activePage') && composable.includes('pageCount'), 'Viewer should track PDF pages.');

assert(toolbar.includes('ZoomIn') && toolbar.includes('ZoomOut'), 'Toolbar should expose zoom controls.');
assert(toolbar.includes('RotateCw') && toolbar.includes('RotateCcw'), 'Toolbar should expose rotation controls.');
assert(toolbar.includes('Download'), 'Toolbar should expose download.');
assert(toolbar.includes('Maximize2') && toolbar.includes('Minimize2'), 'Toolbar should expose fullscreen.');
assert(toolbar.includes('positionLabel'), 'Toolbar should show current page or image position.');

assert(pdfViewer.includes('pdfjs-dist/build/pdf.mjs?url') && pdfViewer.includes('pdf.worker.mjs?url'), 'PDF viewer should use the browser pdfjs bundle.');
assert(pdfViewer.includes('document.getPage(pageNumber)'), 'PDF viewer should render only the active page.');
assert(pdfViewer.includes('ResizeObserver'), 'PDF viewer should recalculate fit modes on resize.');
assert(pdfViewer.includes('cancelRender()') && pdfViewer.includes('destroyDocument()'), 'PDF viewer should cancel rendering and destroy documents.');
assert(pdfViewer.includes("props.fitMode === 'width'") && pdfViewer.includes("props.fitMode === 'page'"), 'PDF viewer should implement width and page fitting.');
assert(!/iframe/i.test(pdfViewer), 'PDF viewer must not fall back to iframe.');
assert(!/Buffer/.test(pdfViewer), 'PDF viewer must not store PDF buffers.');

assert(imageViewer.includes('object-fit: contain'), 'Image viewer should contain images without cropping.');
assert(imageViewer.includes('@wheel="onWheel"') && imageViewer.includes('event.ctrlKey'), 'Image viewer should support Ctrl+wheel zoom.');
assert(imageViewer.includes('@touchstart.passive') && imageViewer.includes('@touchend.passive'), 'Image viewer should support touch swipes.');
assert(imageViewer.includes('ResizeObserver') && imageViewer.includes('resizeObserver?.disconnect()'), 'Image viewer should fit on resize and clean the observer.');

assert(viewer.includes('requestFullscreen') && viewer.includes('exitFullscreen') && viewer.includes('fullscreenchange'), 'Document viewer should support fullscreen and clean fullscreen state.');
assert(viewer.includes("document.addEventListener('keydown'") && viewer.includes("document.removeEventListener('keydown'"), 'Document viewer should register and remove keyboard shortcuts.');
for (const key of ['Escape', 'ArrowLeft', 'ArrowRight', '+', '-', '0', 'r']) {
  assert(viewer.includes(key), `Document viewer should handle keyboard shortcut ${key}.`);
}
assert(viewer.includes('resolveDocumentDownloadUrl') && viewer.includes('anchor.download'), 'Document viewer should use the resolved download URL.');
assert(viewer.includes('infoOpen') && viewer.includes('资料信息'), 'Document viewer should include a metadata information panel.');
assert(viewer.includes('document.body.style.overflow') && viewer.includes('unlockBodyScroll'), 'Document viewer should lock and restore body scroll.');
assert(!/storageKey|checksumSha256|checksum|stagedFileKey|\/data\/hanglian|[A-Za-z]:\\/i.test(viewerSource), 'Viewer UI must not expose storage keys, checksums, or server paths.');
assert(!/mock fallback|fake success|fake preview/i.test(viewerSource + store), 'Viewer work must not fake preview success.');
assert(!/new\s+PrismaClient|DATABASE_URL|db push|migrate|Sealos|S3|企业微信微盘/i.test(viewerSource), 'Viewer work must not connect database, Sealos, S3, or WeCom disk.');

assert(urlHelper.includes('resolveDocumentPreviewUrl') && urlHelper.includes('resolveDocumentDownloadUrl'), 'Viewer should rely on existing URL resolvers.');
assert(packageJson.includes('"document-viewer-foundation:check": "node scripts/document-viewer-foundation-check.mjs"'), 'Root package.json should expose document-viewer-foundation:check.');

const changed = changedFiles();
const allowedChangedFiles = new Set([
  'apps/tablet/src/app/routes.ts',
  paths.library,
  paths.productHome,
  paths.moduleCard,
  paths.moduleGallery,
  paths.store,
  'apps/tablet/src/components/drawing/WarmCreateProductArchiveDialog.vue',
  'apps/tablet/src/components/drawing/WarmUnarchivedProductPanel.vue',
  'apps/tablet/src/components/drawing/WarmPdfImportDialog.vue',
  'apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue',
  'apps/tablet/src/components/hub/WarmHubSearchBar.vue',
  'apps/tablet/src/components/orders/WarmOrderCard.vue',
  'apps/tablet/src/lib/drawing-routes.ts',
  'apps/tablet/src/services/api.ts',
  'apps/tablet/src/stores/drawing-navigation-store.ts',
  'apps/tablet/src/types/production.ts',
  'apps/tablet/src/types/product-resolution.ts',
  'apps/tablet/src/types/drawing-search.ts',
  'apps/api/src/document-hub/document-hub.controller.ts',
  'apps/api/src/document-hub/document-hub.module.ts',
  'apps/api/src/document-hub/document-hub.service.ts',
  'apps/api/src/document-hub/drawing-metadata.store.ts',
  'apps/api/src/document-hub/helpers/document-lifecycle-validator.ts',
  'apps/api/src/document-hub/mock/document-hub.seed.ts',
  'apps/api/src/document-hub/document-version.service.ts',
  'apps/api/src/document-hub/dto/create-drawing-product.dto.ts',
  'apps/api/src/document-hub/dto/document-metadata.dto.ts',
  'apps/api/src/document-hub/dto/drawing-search.dto.ts',
  'apps/api/src/document-hub/dto/resolve-drawing-product.dto.ts',
  paths.viewerTypes,
  'apps/tablet/src/components/drawing/WarmDocumentActionMenu.vue',
  'apps/tablet/src/components/drawing/WarmEditDocumentDialog.vue',
  'apps/tablet/src/components/drawing/WarmSetEffectiveDialog.vue',
  'apps/tablet/src/types/document-version.ts',
  paths.packageJson,
  'scripts/order-product-resolution-check.mjs',
  'scripts/document-viewer-foundation-check.mjs',
  'scripts/document-viewer-thumbnail-check.mjs',
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
  console.error('Document viewer foundation check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('Document viewer foundation check passed.');
