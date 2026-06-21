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

function noStaticImport(source, componentName, file) {
  assert(!new RegExp(`import\\s+${componentName}\\s+from`).test(source), `${file} must not statically import ${componentName}.`);
}

const paths = {
  dashboard: 'apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue',
  hubContent: 'apps/tablet/src/components/hub/WarmHubContent.vue',
  library: 'apps/tablet/src/components/drawing/WarmDrawingLibraryView.vue',
  orderSidebar: 'apps/tablet/src/components/orders/WarmOrderSidebar.vue',
  viewer: 'apps/tablet/src/components/viewer/WarmDocumentViewer.vue',
  moduleGallery: 'apps/tablet/src/components/drawing/WarmDrawingModuleGallery.vue',
  productHome: 'apps/tablet/src/components/drawing/WarmProductDrawingHome.vue',
  trashDialog: 'apps/tablet/src/components/trash/WarmDrawingTrashDialog.vue',
  asyncHelper: 'apps/tablet/src/lib/async-components.ts',
  fallback: 'apps/tablet/src/components/common/WarmAsyncComponentFallback.vue',
  store: 'apps/tablet/src/stores/document-hub-store.ts',
  packageJson: 'package.json',
};

for (const relativePath of Object.values(paths)) {
  assert(existsSync(join(root, relativePath)), `${relativePath} should exist.`);
}

const dashboard = read(paths.dashboard);
const hubContent = read(paths.hubContent);
const library = read(paths.library);
const orderSidebar = read(paths.orderSidebar);
const viewer = read(paths.viewer);
const moduleGallery = read(paths.moduleGallery);
const productHome = read(paths.productHome);
const trashDialog = read(paths.trashDialog);
const asyncHelper = read(paths.asyncHelper);
const fallback = read(paths.fallback);
const store = read(paths.store);
const packageJson = read(paths.packageJson);

assert(asyncHelper.includes('defineAsyncComponent'), 'Async helper should use Vue defineAsyncComponent.');
assert(asyncHelper.includes('shallowRef') && asyncHelper.includes('markRaw'), 'Async helper should use shallowRef and markRaw.');
assert(asyncHelper.includes('load(true)') && fallback.includes("emit('retry')"), 'Async fallback should provide a retry path.');
assert(fallback.includes('state === \'error\'') && fallback.includes('PrimeButton'), 'Fallback should show an error state with retry button.');

for (const component of [
  'WarmHubUploadDialog',
  'WarmPdfImportDialog',
  'WarmCustomerProductMaintenanceDialog',
  'WarmOrderOverviewDialog',
  'WarmDrawingTrashDialog',
  'WarmNetworkDiagnosticsDialog',
]) {
  noStaticImport(dashboard, component, paths.dashboard);
  assert(dashboard.includes(`const ${component} = createWarmAsyncComponent`), `${component} should be declared with createWarmAsyncComponent.`);
}
for (const token of [
  'v-if="store.orderOverviewOpen"',
  'v-if="store.uploadDialogOpen"',
  'v-if="store.pdfImportDialogOpen"',
  'v-if="store.maintenanceOpen"',
  'v-if="store.createProductArchiveDialogOpen"',
  'v-if="store.drawingTrashDialogOpen"',
  'v-if="networkDiagnosticsOpen"',
]) {
  assert(dashboard.includes(token), `Dashboard should mount dialogs on demand with ${token}.`);
}

noStaticImport(hubContent, 'WarmConnectorParameterView', paths.hubContent);
noStaticImport(hubContent, 'WarmFixtureParameterView', paths.hubContent);
assert(hubContent.includes("import('@/components/connector/WarmConnectorParameterView.vue')"), 'Connector view should be dynamically imported.');
assert(hubContent.includes("import('@/components/fixture/WarmFixtureParameterView.vue')"), 'Fixture view should be dynamically imported.');

noStaticImport(library, 'WarmDocumentViewer', paths.library);
assert(library.includes("import('@/components/viewer/WarmDocumentViewer.vue')"), 'Document viewer should be dynamically imported from the drawing library.');
assert(library.includes('v-if="store.documentViewerOpen"'), 'Document viewer should mount only when opened.');

noStaticImport(orderSidebar, 'WarmOrderImportDialog', paths.orderSidebar);
noStaticImport(orderSidebar, 'WarmOrderProductLinkDialog', paths.orderSidebar);
assert(orderSidebar.includes('v-if="store.orderImportOpen"'), 'Order import dialog should mount only when opened.');
assert(orderSidebar.includes('v-if="store.pendingProductLinkOrder"'), 'Order product link dialog should mount only when needed.');

for (const component of ['WarmPdfViewer', 'WarmImageViewer', 'WarmThumbnailRail', 'WarmEditDocumentDialog', 'WarmSetEffectiveDialog', 'WarmMoveToTrashDialog']) {
  noStaticImport(viewer, component, paths.viewer);
  assert(viewer.includes(`const ${component} = createWarmAsyncComponent`), `${component} should be lazy loaded inside the document viewer.`);
}
assert(viewer.includes('v-if="moveToTrashOpen"'), 'Viewer trash dialog should mount only when opened.');
assert(viewer.includes('v-if="editDialogOpen"'), 'Viewer edit dialog should mount only when opened.');
assert(viewer.includes('v-if="effectiveDialogOpen"'), 'Viewer effective dialog should mount only when opened.');

for (const source of [moduleGallery, productHome, trashDialog]) {
  assert(source.includes('createWarmAsyncComponent'), 'Secondary drawing surfaces should lazy load heavy dialogs/viewer.');
}
assert(moduleGallery.includes('v-if="moveToTrashOpen"') && moduleGallery.includes('v-if="editDialogOpen"') && moduleGallery.includes('v-if="effectiveDialogOpen"'), 'Module gallery dialogs should be on-demand.');
assert(productHome.includes('v-if="moveToTrashOpen"'), 'Product home trash dialog should be on-demand.');
assert(trashDialog.includes('v-if="purgeVisible"') && trashDialog.includes('v-if="viewerOpen"'), 'Trash purge and trash viewer should be on-demand.');

assert(store.includes('await Promise.all([loadOrders(), loadCustomers()])'), 'Store initialization should not load connector or fixture data before their modes open.');
assert(store.includes("if (mode === 'connector') void loadConnectors()"), 'Connector data should still load when connector mode opens.');
assert(store.includes("if (mode === 'fixture') void loadFixtures()"), 'Fixture data should still load when fixture mode opens.');

const changed = changedFiles();
assert(!changed.some((file) => file.startsWith('apps/api/')), 'This frontend performance step must not modify backend files.');
assert(!changed.some((file) => file.includes('prisma/schema.prisma')), 'This step must not modify Prisma schema.');
assert(!changed.some((file) => file.startsWith('apps/tablet/src/components/connector/')), 'Connector component fields must remain unchanged.');
assert(!changed.some((file) => file.startsWith('apps/tablet/src/components/fixture/')), 'Fixture component fields must remain unchanged.');
assert(!changed.some((file) => /storage\/(metadata|uploads|tmp)\//.test(file)), 'Runtime storage files must not be changed.');
assert(!/new\s+PrismaClient|DATABASE_URL|db push|migrate|Sealos/i.test([dashboard, hubContent, library, orderSidebar, viewer, store].join('\n')), 'Frontend lazy loading changes must not connect to database or Sealos.');
assert(packageJson.includes('"frontend-lazy-loading:check": "node scripts/frontend-lazy-loading-check.mjs"'), 'Root package.json should expose frontend-lazy-loading:check.');

if (blockers.length) {
  console.error('Frontend lazy loading check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('Frontend lazy loading check passed.');
