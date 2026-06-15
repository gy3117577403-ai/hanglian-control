import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const blockers = [];

function file(relativePath) {
  return join(root, relativePath);
}

function exists(relativePath) {
  return existsSync(file(relativePath));
}

function read(relativePath) {
  return exists(relativePath) ? readFileSync(file(relativePath), 'utf8') : '';
}

function requireFile(relativePath) {
  if (!exists(relativePath)) blockers.push(`Missing file: ${relativePath}`);
}

function requireIncludes(relativePath, text, message) {
  if (!read(relativePath).includes(text)) blockers.push(message);
}

function requireNotIncludes(relativePath, text, message) {
  if (read(relativePath).includes(text)) blockers.push(message);
}

[
  'apps/api/src/document-hub/document-hub.module.ts',
  'apps/api/src/document-hub/document-hub.controller.ts',
  'apps/api/src/document-hub/document-hub.service.ts',
  'apps/api/src/document-hub/mock/document-hub.seed.ts',
  'apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue',
  'apps/tablet/src/components/hub/WarmFunctionOrb.vue',
  'apps/tablet/src/components/hub/WarmHubHeader.vue',
  'apps/tablet/src/components/hub/WarmHubSearchBar.vue',
  'apps/tablet/src/components/hub/WarmHubContent.vue',
  'apps/tablet/src/components/hub/WarmHubUploadDialog.vue',
  'apps/tablet/src/components/orders/WarmOrderSidebar.vue',
  'apps/tablet/src/components/orders/WarmOrderCard.vue',
  'apps/tablet/src/components/orders/WarmOrderOverviewDialog.vue',
  'apps/tablet/src/components/drawing/WarmDrawingLibraryView.vue',
  'apps/tablet/src/components/drawing/WarmCustomerGrid.vue',
  'apps/tablet/src/components/drawing/WarmProductModelGrid.vue',
  'apps/tablet/src/components/drawing/WarmProductDrawingHome.vue',
  'apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue',
  'apps/tablet/src/components/drawing/WarmDrawingModuleGallery.vue',
  'apps/tablet/src/components/drawing/WarmImageDetailViewer.vue',
  'apps/tablet/src/components/drawing/WarmDrawingBreadcrumb.vue',
  'apps/tablet/src/components/connector/WarmConnectorParameterView.vue',
  'apps/tablet/src/components/connector/WarmConnectorTable.vue',
  'apps/tablet/src/components/connector/WarmConnectorDetailDialog.vue',
  'apps/tablet/src/components/fixture/WarmFixtureParameterView.vue',
  'apps/tablet/src/components/fixture/WarmFixtureTable.vue',
  'apps/tablet/src/components/fixture/WarmFixtureDetailDialog.vue',
  'apps/tablet/src/stores/document-hub-store.ts',
  'apps/tablet/src/stores/navigation-memory-store.ts',
  'apps/tablet/src/mock/order-hub-data.ts',
  'docs/v3.3-game-doc-hub-orders.md',
].forEach(requireFile);

requireIncludes('package.json', '"document-hub:check"', 'package.json is missing document-hub:check.');
requireIncludes('apps/api/src/app.module.ts', 'DocumentHubModule', 'AppModule does not import DocumentHubModule.');
[
  "Controller('document-hub')",
  "Get('orders')",
  "Post('orders/:orderId/complete')",
  "Get('orders/overview')",
  "Get('drawings/customers')",
  "Get('drawings/customers/:customerId/products')",
  "Get('drawings/products/:productId')",
  "Get('drawings/products/:productId/modules/:moduleKey')",
  "Post('drawings/products/:productId/modules/:moduleKey/upload')",
  "Get('connectors')",
  "Get('fixtures')",
  "Get('search')",
].forEach((text) => requireIncludes('apps/api/src/document-hub/document-hub.controller.ts', text, `document-hub API missing: ${text}`));

[
  'setActiveMode',
  'loadOrders',
  'completeOrder',
  'openOrderProduct',
  'openCustomer',
  'openProduct',
  'openModule',
  'openImageDetail',
  'goBack',
  'searchCurrentMode',
  'uploadToModule',
].forEach((text) => requireIncludes('apps/tablet/src/stores/document-hub-store.ts', text, `document hub store missing: ${text}`));

[
  'pushReturnPoint',
  'popReturnPoint',
  'saveScrollPosition',
  'restoreScrollPosition',
].forEach((text) => requireIncludes('apps/tablet/src/stores/navigation-memory-store.ts', text, `navigation memory missing: ${text}`));

requireIncludes('apps/tablet/src/views/TabletDashboard.vue', 'WarmDocumentHubDashboard', '/tablet does not render WarmDocumentHubDashboard.');
requireNotIncludes('apps/tablet/src/views/TabletDashboard.vue', 'WarmUnifiedDocumentCenter', '/tablet should not render the old unified document center in this stage.');
requireIncludes('apps/tablet/src/components/hub/WarmFunctionOrb.vue', '图纸库', 'Function orb missing drawing entry.');
requireIncludes('apps/tablet/src/components/hub/WarmFunctionOrb.vue', '连接器参数', 'Function orb missing connector entry.');
requireIncludes('apps/tablet/src/components/hub/WarmFunctionOrb.vue', '治具参数', 'Function orb missing fixture entry.');
requireIncludes('apps/tablet/src/components/orders/WarmOrderSidebar.vue', '今日订单', 'Order sidebar missing today orders.');
requireIncludes('apps/tablet/src/components/orders/WarmOrderSidebar.vue', '本周订单', 'Order sidebar missing week orders.');
requireIncludes('apps/tablet/src/components/orders/WarmOrderOverviewDialog.vue', '已完成', 'Order overview missing completed section.');
requireIncludes('apps/tablet/src/components/drawing/WarmProductDrawingHome.vue', 'WarmDrawingModuleCard', 'Drawing detail does not render module cards.');
requireIncludes('apps/tablet/src/components/drawing/WarmDrawingModuleGallery.vue', '上传到本模块', 'Module gallery missing bound upload entry.');
requireIncludes('apps/tablet/src/components/connector/WarmConnectorParameterView.vue', '连接器参数', 'Connector parameter view missing.');
requireIncludes('apps/tablet/src/components/fixture/WarmFixtureParameterView.vue', '治具参数', 'Fixture parameter view missing.');
requireIncludes('apps/api/src/unified-documents/helpers/delete-lock.service.ts', 'defaultDeletePasswordHash', 'Delete lock default hash initialization missing.');
requireIncludes('apps/api/src/unified-documents/helpers/delete-lock.service.ts', 'passwordHash: defaultDeletePasswordHash', 'Delete lock default hash is not used.');
requireNotIncludes('apps/api/src/unified-documents/helpers/delete-lock.service.ts', "hashSync('123'", 'Delete lock source must not build the default password from plain text.');
requireNotIncludes('apps/api/src/unified-documents/helpers/delete-lock.service.ts', 'passwordHash: "123"', 'Delete lock source must not store plain text password.');
requireNotIncludes('apps/api/src/unified-documents/helpers/delete-lock.service.ts', "passwordHash: '123'", 'Delete lock source must not store plain text password.');

const mainSource = [
  'apps/tablet/src/views/TabletDashboard.vue',
  'apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue',
  'apps/tablet/src/components/hub/WarmHubHeader.vue',
  'apps/tablet/src/components/hub/WarmHubSearchBar.vue',
  'apps/tablet/src/components/hub/WarmHubContent.vue',
  'apps/tablet/src/components/orders/WarmOrderSidebar.vue',
].map((path) => read(path)).join('\n');

[
  'API 在线',
  'Mock 数据源',
  '未接 Sealos',
  '前段组长',
  '后段组长',
  '演示工具',
  '现场模式',
  '统计看板',
  '生产任务队列',
].forEach((text) => {
  if (mainSource.includes(text)) blockers.push(`Main page still contains old hidden UI label: ${text}`);
});

[
  'db:readonly-check',
  'migrate dev',
  'migrate deploy',
  'db push',
  'db seed',
  'prisma:seed:test-db',
  'postgresql://',
  'DATABASE_URL',
].forEach((text) => {
  if (mainSource.includes(text)) blockers.push(`Main page source must not contain database command or secret marker: ${text}`);
});

console.log('V3.3 document hub check');
console.log('This check is read-only. It does not connect to a database and does not write data.');

if (blockers.length) {
  console.log('\nBlockers:');
  for (const blocker of blockers) console.log(`- ${blocker}`);
  process.exit(1);
}

console.log('\nV3.3 document hub check passed.');
