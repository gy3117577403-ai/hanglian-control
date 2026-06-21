import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function methodBody(source, methodName) {
  const patterns = [
    `async function ${methodName}`,
    `function ${methodName}`,
    `export async function ${methodName}`,
    `export function ${methodName}`,
  ];
  const start = patterns
    .map((pattern) => source.indexOf(pattern))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0] ?? -1;
  if (start < 0) return '';
  const signatureEnd = source.indexOf(') {', start);
  const braceStart = signatureEnd >= 0 ? signatureEnd + 2 : source.indexOf('{', start);
  if (braceStart < 0) return '';
  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(braceStart, index + 1);
    }
  }
  return '';
}

function changedFiles() {
  const result = spawnSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' });
  if (result.error) {
    failures.push(`无法读取 git status: ${result.error.message}`);
    return [];
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.slice(3).trim())
    .filter(Boolean)
    .map((line) => line.includes(' -> ') ? line.split(' -> ').pop() ?? line : line)
    .map((line) => line.replaceAll('\\', '/'));
}

const files = {
  api: 'apps/tablet/src/services/api.ts',
  store: 'apps/tablet/src/stores/document-hub-store.ts',
  types: 'apps/tablet/src/types/order-management.ts',
  productionResolution: 'apps/tablet/src/types/product-resolution.ts',
  card: 'apps/tablet/src/components/orders/WarmOrderCard.vue',
  sidebar: 'apps/tablet/src/components/orders/WarmOrderSidebar.vue',
  statusMenu: 'apps/tablet/src/components/orders/WarmOrderStatusMenu.vue',
  productLink: 'apps/tablet/src/components/orders/WarmOrderProductLinkDialog.vue',
  unarchivedPanel: 'apps/tablet/src/components/drawing/WarmUnarchivedProductPanel.vue',
  packageJson: 'package.json',
};

for (const [label, relativePath] of Object.entries(files)) {
  assert(existsSync(join(root, relativePath)), `${label} 文件不存在：${relativePath}`);
}

const api = read(files.api);
const store = read(files.store);
const types = read(files.types);
const sidebar = read(files.sidebar);
const card = read(files.card);
const statusMenu = read(files.statusMenu);
const productLink = read(files.productLink);
const unarchivedPanel = read(files.unarchivedPanel);
const packageJson = read(files.packageJson);

const getOrdersBody = methodBody(api, 'getDocumentHubOrders');
const previewBody = methodBody(api, 'previewOrderImport');
const applyBody = methodBody(api, 'applyOrderImport');
const updateBody = methodBody(api, 'updateOrderProductionStatus');
const completeBody = methodBody(api, 'completeDocumentHubOrder');
const restoreBody = methodBody(api, 'restoreDocumentHubOrder');
const linkBody = methodBody(api, 'linkOrderProduct');

assert(types.includes("export type OrderScope = 'today' | 'week'"), 'OrderScope 类型应包含 today/week。');
assert(types.includes("export type OrderProductionStatus = 'front' | 'back' | 'no_drawing'"), '订单生产状态类型不完整。');
assert(types.includes('OrderImportPreviewResponse') && types.includes('OrderImportApplyResponse'), '订单导入 Preview/Apply 类型不完整。');
assert(types.includes('OrderOverviewResponse') && types.includes('ProductionOrder'), '订单总览或订单记录类型不完整。');
assert(!/metadataRoot|METADATA_ROOT|storageKey|staged|DATABASE_URL/i.test(types), '订单前端类型不能暴露 metadata 路径、staged key 或数据库字段。');

assert(getOrdersBody.includes('/document-hub/orders'), '订单查询 API 未接入真实后端。');
assert(api.includes('completionStatus') && api.includes('productionStatus') && api.includes('linkedProductId'), '订单查询 API 缺少筛选参数。');
assert(previewBody.includes('FormData') && previewBody.includes("formData.append('file'") && previewBody.includes("formData.append('scope'"), '订单 Preview 必须使用 FormData 上传 XLSX。');
assert(previewBody.includes('.xlsx') && !previewBody.includes('Content-Type'), '订单 Preview 应限制 XLSX 且不能手动设置 multipart boundary。');
assert(applyBody.includes('/document-hub/orders/import/apply'), '订单 Apply API 未接入。');
assert(updateBody.includes("method: 'PATCH'") && updateBody.includes('/status'), '订单状态更新必须使用 PATCH。');
assert(completeBody.includes('/complete') && completeBody.includes("method: 'POST'"), '完成订单 API 未接入。');
assert(restoreBody.includes('/restore') && restoreBody.includes("method: 'POST'"), '恢复订单 API 未接入。');
assert(linkBody.includes('/product-link') && linkBody.includes('encodeURIComponent(orderId)'), '产品绑定 API 必须使用 product-link 并编码 orderId。');
assert(!/mock fallback|fake success|fake preview/i.test(api), '订单 API 不允许 mock fallback 或假成功。');

assert(store.includes("const activeOrderScope = ref<OrderScope>('week')"), 'Store 默认应显示本周订单。');
for (const token of [
  'todayOrders',
  'weekOrders',
  'ordersLoading',
  'ordersError',
  'orderImportOpen',
  'orderImportScope',
  'orderImportFile',
  'orderImportPreview',
  'orderImportItems',
  'orderImportResult',
  'orderOverviewOpen',
  'orderOverview',
  'orderActionLoadingId',
  'pendingProductLinkOrder',
]) {
  assert(store.includes(token), `Store 缺少状态：${token}`);
}
for (const token of [
  'setActiveOrderScope',
  'loadOrders',
  'loadTodayOrders',
  'loadWeekOrders',
  'setOrderImportFile',
  'previewOrderImport',
  'updateOrderImportItem',
  'applyOrderImport',
  'resetOrderImport',
  'updateOrderStatus',
  'completeOrder',
  'restoreOrder',
  'loadOrderOverview',
  'openOrderOverview',
  'closeOrderOverview',
  'linkOrderToProduct',
  'refreshOrdersAfterAction',
]) {
  assert(store.includes(`function ${token}`) || store.includes(`async function ${token}`), `Store 缺少动作：${token}`);
}

const completeStoreBody = methodBody(store, 'completeOrder');
const restoreStoreBody = methodBody(store, 'restoreOrder');
const statusStoreBody = methodBody(store, 'updateOrderStatus');
const applyStoreBody = methodBody(store, 'applyOrderImport');
assert(completeStoreBody.includes('completeDocumentHubOrder') && completeStoreBody.includes('refreshOrdersAfterAction') && !completeStoreBody.includes('patchOrder'), '完成订单必须成功后刷新，不允许本地假完成。');
assert(restoreStoreBody.includes('restoreDocumentHubOrder') && restoreStoreBody.includes('refreshOrdersAfterAction') && !restoreStoreBody.includes('unshift'), '恢复订单必须成功后刷新，不允许失败时插回本地列表。');
assert(statusStoreBody.includes('updateOrderProductionStatus') && statusStoreBody.includes('refreshOrdersAfterAction'), '状态切换必须调用真实 PATCH 后刷新。');
assert(applyStoreBody.includes('applyOrderImportRequest') && applyStoreBody.includes('refreshOrdersAfterAction'), '订单导入 Apply 必须调用真实 API 并刷新订单。');
assert(!store.includes('mockHubOrders') && !store.includes('localOrders'), '订单 Store 不应再使用本地 mock 订单 fallback。');
assert(!/localStorage\.setItem[\s\S]{0,120}orderImportFile|orderImportFile[\s\S]{0,120}localStorage\.setItem/.test(store), 'Excel File 对象不得持久化到 localStorage。');

assert(card.includes('quantityProvided') && card.includes('数量未填写'), '订单卡片必须正确展示未填写数量。');
assert(statusMenu.includes('在前端') && statusMenu.includes('在后端') && statusMenu.includes('未发图'), '三种订单状态中文映射缺失。');
assert(statusMenu.includes('当前产品尚无原图，不能切换生产状态。'), '无原图状态保护提示缺失。');
assert(productLink.includes('store.linkOrderToProduct') && productLink.includes('选择客户') && productLink.includes('选择产品资料页'), '同型号多客户绑定弹窗未接入真实 Store。');
assert(
  sidebar.includes('store.setActiveOrderScope') &&
  sidebar.includes('orders-${store.activeOrderScope}') &&
  store.includes('orders-${scope}'),
  '今日/本周切换和滚动 key 不完整。',
);
assert(unarchivedPanel.includes('数量未填写'), '未建档引导页也应避免把空数量显示成假 0 或假 1。');

const allowed = new Set([
  ...Object.values(files),
  'apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue',
  'apps/tablet/src/components/hub/WarmHubHeader.vue',
  'apps/tablet/src/components/orders/WarmOrderImportDialog.vue',
  'apps/tablet/src/components/orders/WarmOrderImportFilePanel.vue',
  'apps/tablet/src/components/orders/WarmOrderImportPreview.vue',
  'apps/tablet/src/components/orders/WarmOrderImportResult.vue',
  'apps/tablet/src/components/orders/WarmOrderOverviewDialog.vue',
  'apps/tablet/src/components/orders/WarmOrderOverviewList.vue',
  'scripts/order-frontend-state-check.mjs',
  'scripts/order-import-ui-check.mjs',
  'scripts/order-overview-ui-check.mjs',
  'scripts/order-sidebar-layout-check.mjs',
  'scripts/tablet-ui-smoke-check.mjs',
]);
for (const file of changedFiles()) {
  assert(allowed.has(file), `出现非本轮允许修改文件：${file}`);
  assert(!file.startsWith('apps/api/'), `不允许修改后端文件：${file}`);
  assert(!file.includes('prisma/'), `不允许修改 Prisma 文件：${file}`);
  assert(!file.includes('/connector/') && !file.includes('/fixture/'), `不允许修改连接器或治具文件：${file}`);
}

assert(packageJson.includes('"order-frontend-state:check": "node scripts/order-frontend-state-check.mjs"'), 'package.json 缺少 order-frontend-state:check。');

if (failures.length) {
  console.error('订单前端状态检查失败：');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('订单前端状态检查通过。');
