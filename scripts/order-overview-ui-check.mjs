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
  sidebar: 'apps/tablet/src/components/orders/WarmOrderSidebar.vue',
  card: 'apps/tablet/src/components/orders/WarmOrderCard.vue',
  statusMenu: 'apps/tablet/src/components/orders/WarmOrderStatusMenu.vue',
  overview: 'apps/tablet/src/components/orders/WarmOrderOverviewDialog.vue',
  overviewList: 'apps/tablet/src/components/orders/WarmOrderOverviewList.vue',
  productLink: 'apps/tablet/src/components/orders/WarmOrderProductLinkDialog.vue',
  header: 'apps/tablet/src/components/hub/WarmHubHeader.vue',
  store: 'apps/tablet/src/stores/document-hub-store.ts',
  api: 'apps/tablet/src/services/api.ts',
  packageJson: 'package.json',
};

for (const [label, relativePath] of Object.entries(files)) {
  assert(existsSync(join(root, relativePath)), `${label} 文件不存在：${relativePath}`);
}

const sidebar = read(files.sidebar);
const card = read(files.card);
const statusMenu = read(files.statusMenu);
const overview = read(files.overview);
const overviewList = read(files.overviewList);
const productLink = read(files.productLink);
const header = read(files.header);
const store = read(files.store);
const api = read(files.api);
const packageJson = read(files.packageJson);
const ui = [sidebar, card, statusMenu, overview, overviewList, productLink, header].join('\n');

assert(sidebar.includes('今日订单') && sidebar.includes('本周订单') && sidebar.includes('store.setActiveOrderScope'), '侧栏应支持今日/本周切换。');
assert(sidebar.includes('orders-${store.activeOrderScope}') && store.includes('orders-${scope}'), '侧栏应为不同范围保留滚动位置 key。');
assert(sidebar.includes('PrimeSkeleton') && sidebar.includes('重试'), '侧栏应提供 loading Skeleton 和失败重试入口。');
assert(sidebar.includes('今日暂无待完成订单。') && sidebar.includes('本周暂无待完成订单。'), '侧栏空状态文案缺失。');
assert(card.includes('产品未建档') && card.includes('客户未建档') && card.includes('需确认客户') && card.includes('已绑定资料页'), '订单卡片产品绑定状态不完整。');
assert(card.includes('数量未填写') && !card.includes('数量 0'), '订单卡片不得用假 0 代替未填写数量。');

assert(statusMenu.includes('在前端') && statusMenu.includes('在后端') && statusMenu.includes('未发图'), '状态菜单缺少三种中文状态。');
assert(statusMenu.includes('当前产品尚无原图，不能切换生产状态。'), '无原图状态保护缺失。');
assert(statusMenu.includes('请先恢复订单。'), '已完成订单状态保护缺失。');

assert(header.includes('order-overview-button') && header.includes('store.openOrderOverview()') && header.includes('订单总览'), '右上角订单总览入口未接入。');
assert(overview.includes('今日') && overview.includes('本周') && overview.includes('待完成') && overview.includes('已完成'), '总览筛选缺少范围或完成状态。');
assert(overview.includes('在前端') && overview.includes('在后端') && overview.includes('未发图'), '总览筛选缺少生产状态。');
assert(overview.includes('总数') && overview.includes('待完成') && overview.includes('已完成'), '总览统计缺失。');
assert(overview.includes('WarmOrderOverviewList') && overview.includes('搜索产品型号'), '总览具体型号列表或搜索缺失。');
assert(overview.includes('store.loadOrderOverview()'), '打开总览应加载真实 overview。');

assert(overviewList.includes('完成') && overviewList.includes('恢复'), '总览列表应支持完成和恢复。');
assert(overviewList.includes('WarmOrderStatusMenu'), '总览列表应复用状态菜单。');
assert(overviewList.includes('暂无符合条件的订单。'), '总览列表空状态缺失。');
assert(overviewList.includes('数量未填写'), '总览列表不得用假 0 展示未填写数量。');
assert(productLink.includes('store.linkOrderToProduct') && productLink.includes('确认绑定'), '多客户同型号绑定弹窗未接入。');

assert(api.includes('getOrderOverview') && api.includes('/document-hub/orders/overview'), '总览 API 未接入。');
assert(api.includes('restoreDocumentHubOrder') && api.includes('/restore'), '恢复订单 API 未接入。');
assert(api.includes('updateOrderProductionStatus') && api.includes('/status'), '状态更新 API 未接入。');
assert(api.includes('completeDocumentHubOrder') && api.includes('/complete'), '完成订单 API 未接入。');
assert(store.includes('restoreDocumentHubOrder') && store.includes('completeDocumentHubOrder') && store.includes('updateOrderProductionStatus'), 'Store 写动作未接入真实 API。');
assert(store.includes('refreshOrdersAfterAction') && store.includes('completedOrders.value = overview.completedOrders.map'), '完成/恢复后应刷新主列表和总览，已完成订单仍在总览。');

assert(!/new\s+PrismaClient|DATABASE_URL|Sealos|db push|migrate/i.test([store, api, ui].join('\n')), '订单前端不得连接数据库或触碰 Sealos。');
assert(!/mockHubOrders|localOrders|fake success|fake order/i.test(store), '订单前端不得使用旧本地假订单。');

for (const file of changedFiles()) {
  assert(!file.startsWith('apps/api/'), `不允许修改后端文件：${file}`);
  assert(!file.includes('prisma/'), `不允许修改 Prisma 文件：${file}`);
  assert(!file.includes('/connector/'), `不允许修改连接器文件：${file}`);
  assert(!file.includes('/fixture/'), `不允许修改治具文件：${file}`);
}

assert(packageJson.includes('"order-overview-ui:check": "node scripts/order-overview-ui-check.mjs"'), 'package.json 缺少 order-overview-ui:check。');

if (failures.length) {
  console.error('订单总览界面检查失败：');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('订单总览界面检查通过。');
