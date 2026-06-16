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
  'apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue',
  'apps/tablet/src/components/hub/WarmFunctionOrb.vue',
  'apps/tablet/src/components/hub/WarmHubHeader.vue',
  'apps/tablet/src/components/hub/WarmHubSearchBar.vue',
  'apps/tablet/src/components/hub/WarmHubUploadDialog.vue',
  'apps/tablet/src/components/orders/WarmOrderSidebar.vue',
  'apps/tablet/src/components/orders/WarmOrderCard.vue',
  'apps/tablet/src/components/orders/WarmOrderOverviewDialog.vue',
  'apps/tablet/src/components/drawing/WarmCustomerGrid.vue',
  'apps/tablet/src/components/drawing/WarmProductModelGrid.vue',
  'apps/tablet/src/components/drawing/WarmProductDrawingHome.vue',
  'apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue',
  'apps/tablet/src/components/drawing/WarmDrawingModuleGallery.vue',
  'apps/tablet/src/components/drawing/WarmImageDetailViewer.vue',
  'apps/tablet/src/stores/navigation-memory-store.ts',
  'apps/tablet/src/stores/document-hub-store.ts',
  'apps/tablet/src/components/connector/WarmConnectorParameterView.vue',
  'apps/tablet/src/components/connector/WarmConnectorTable.vue',
  'apps/tablet/src/components/fixture/WarmFixtureParameterView.vue',
  'apps/tablet/src/components/fixture/WarmFixtureTable.vue',
  'apps/tablet/src/components/unified/WarmDeletePasswordDialog.vue',
  'docs/v3.4-document-hub-polish.md',
].forEach(requireFile);

requireIncludes('package.json', '"document-hub-polish:check"', 'package.json missing document-hub-polish:check.');
requireIncludes('apps/tablet/src/views/TabletDashboard.vue', 'WarmDocumentHubDashboard', '/tablet should render the V3.4 document hub dashboard.');
requireIncludes('apps/tablet/src/components/hub/WarmFunctionOrb.vue', '资料库', 'Function orb missing main label.');
requireIncludes('apps/tablet/src/components/hub/WarmFunctionOrb.vue', 'pointerdown', 'Function orb should collapse on outside pointerdown.');
requireIncludes('apps/tablet/src/components/hub/WarmHubHeader.vue', 'store.openTopUpload()', 'Header upload should use top upload mode.');
requireIncludes('apps/tablet/src/components/hub/WarmHubSearchBar.vue', 'currentSearchPlaceholder', 'Search placeholder must be mode-aware.');
requireIncludes('apps/tablet/src/components/orders/WarmOrderSidebar.vue', '今日订单', 'Order sidebar missing today section.');
requireIncludes('apps/tablet/src/components/orders/WarmOrderSidebar.vue', '本周订单', 'Order sidebar missing week section.');
requireIncludes('apps/tablet/src/components/orders/WarmOrderCard.vue', '在前段', 'Order status missing front label.');
requireIncludes('apps/tablet/src/components/orders/WarmOrderCard.vue', '在后段', 'Order status missing back label.');
requireIncludes('apps/tablet/src/components/orders/WarmOrderCard.vue', '未发图', 'Order status missing no drawing label.');
requireIncludes('apps/tablet/src/components/orders/WarmOrderOverviewDialog.vue', '重新加入', 'Order overview missing reopen action.');
requireIncludes('apps/tablet/src/components/orders/WarmOrderOverviewDialog.vue', 'order-overview', 'Order overview should have scroll memory key.');
requireIncludes('apps/tablet/src/components/drawing/WarmCustomerGrid.vue', '产品型号导入', 'Customer empty state should mention product model import.');
requireIncludes('apps/tablet/src/components/drawing/WarmProductModelGrid.vue', '模块', 'Product card should include module completeness.');
requireIncludes('apps/tablet/src/components/drawing/WarmProductDrawingHome.vue', '上传资料', 'Drawing detail should keep upload entry.');
requireIncludes('apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue', '共 {{ module.items.length }} 项', 'Module card should show item count.');
requireIncludes('apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue', '企业微信微盘同步原图', 'Original drawing empty state should mention future WeCom disk sync.');
requireIncludes('apps/tablet/src/components/drawing/WarmDrawingModuleGallery.vue', '该模块暂无资料，可点击上传补充。', 'Module gallery missing empty state.');
requireIncludes('apps/tablet/src/components/drawing/WarmImageDetailViewer.vue', '第 {{ currentNumber }} 张 / 共 {{ items.length }} 张', 'Image viewer missing current/total indicator.');
requireIncludes('apps/tablet/src/components/drawing/WarmImageDetailViewer.vue', '图片加载失败', 'Image viewer missing load failure copy.');
requireIncludes('apps/tablet/src/stores/document-hub-store.ts', 'openModuleUpload', 'Store missing module upload mode.');
requireIncludes('apps/tablet/src/stores/document-hub-store.ts', 'openTopUpload', 'Store missing top upload mode.');
requireIncludes('apps/tablet/src/stores/document-hub-store.ts', 'reopenOrder', 'Store missing reopen order action.');
requireIncludes('apps/tablet/src/components/connector/WarmConnectorTable.vue', 'table-head', 'Connector parameter table should use a fixed header.');
requireIncludes('apps/tablet/src/components/connector/WarmConnectorTable.vue', '暂无连接器参数', 'Connector empty state missing.');
requireIncludes('apps/tablet/src/components/fixture/WarmFixtureTable.vue', 'table-head', 'Fixture parameter table should use a fixed header.');
requireIncludes('apps/tablet/src/components/fixture/WarmFixtureTable.vue', '暂无治具参数', 'Fixture empty state missing.');
requireIncludes('apps/tablet/src/components/unified/WarmDeletePasswordDialog.vue', '默认删除密码为 123', 'Delete password default copy missing.');
requireIncludes('apps/tablet/src/components/unified/WarmDeletePasswordDialog.vue', '请输入删除密码以继续', 'Delete password input copy missing.');

const mainSource = [
  'apps/tablet/src/views/TabletDashboard.vue',
  'apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue',
  'apps/tablet/src/components/hub/WarmHubHeader.vue',
  'apps/tablet/src/components/hub/WarmHubSearchBar.vue',
  'apps/tablet/src/components/hub/WarmHubContent.vue',
  'apps/tablet/src/components/orders/WarmOrderSidebar.vue',
  'apps/tablet/src/components/drawing/WarmDrawingLibraryView.vue',
  'apps/tablet/src/components/connector/WarmConnectorParameterView.vue',
  'apps/tablet/src/components/fixture/WarmFixtureParameterView.vue',
].map((path) => read(path)).join('\n');

[
  '资料类型',
  '客户/产品筛选',
  '最近查询',
  '当前锁定产品',
  '生产任务队列',
  '现场操作步骤',
  '现场快捷操作',
  '资料完整度生产看板',
  '组长确认',
  '异常反馈',
  '演示工具',
  '现场模式',
  '角色权限',
  'API 在线',
  'Mock 数据源',
  '未接 Sealos',
].forEach((text) => {
  if (mainSource.includes(text)) blockers.push(`Main page still contains old UI label: ${text}`);
});

[
  'db:readonly-check',
  'migrate dev',
  'migrate deploy',
  'db push',
  'db seed',
  'prisma:seed:test-db',
  'postgresql://',
  'DATABASE_URL=',
].forEach((text) => {
  if (mainSource.includes(text)) blockers.push(`Main page source must not contain database command or secret marker: ${text}`);
});

console.log('V3.4 document hub polish check');
console.log('This check is read-only. It does not connect to a database and does not write data.');

if (blockers.length) {
  console.log('\nBlockers:');
  for (const blocker of blockers) console.log(`- ${blocker}`);
  process.exit(1);
}

console.log('\nV3.4 document hub polish check passed.');
