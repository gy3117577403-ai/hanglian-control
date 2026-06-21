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
    .map((line) => (line.includes(' -> ') ? line.split(' -> ').pop() ?? line : line))
    .map((line) => line.replaceAll('\\', '/'));
}

const files = {
  dashboard: 'apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue',
  sidebar: 'apps/tablet/src/components/orders/WarmOrderSidebar.vue',
  card: 'apps/tablet/src/components/orders/WarmOrderCard.vue',
  packageJson: 'package.json',
};

for (const [label, relativePath] of Object.entries(files)) {
  assert(existsSync(join(root, relativePath)), `${label} 文件不存在：${relativePath}`);
}

const dashboard = read(files.dashboard);
const sidebar = read(files.sidebar);
const card = read(files.card);
const packageJson = read(files.packageJson);
const inspected = [dashboard, sidebar, card].join('\n');

assert(dashboard.includes('--order-column-width: 238px') || dashboard.includes('--order-column-width: 240px'), '展开订单栏应使用 220px-250px 的受控宽度。');
assert(/--order-column-width:\s*22[0-9]px/.test(dashboard) || /--order-column-width:\s*23[0-9]px/.test(dashboard) || /--order-column-width:\s*24[0-9]px/.test(dashboard), '窄屏订单栏仍应保持 220px-250px。');
assert(dashboard.includes('grid-template-columns: var(--order-column-width) minmax(0, 1fr)'), '主页面应使用稳定双栏 grid。');
assert(dashboard.includes('overflow: hidden'), '主页面内容区应禁止页面级横向滚动。');
assert(dashboard.includes('.hub-body > *') && dashboard.includes('min-width: 0'), '主内容应设置 min-width: 0。');
assert(/orders-collapsed[\s\S]{0,80}--order-column-width:\s*6[0-9]px/.test(dashboard), '折叠状态宽度应约 56-72px。');

assert(sidebar.includes('flex-shrink: 0'), '订单侧栏应禁止 flex shrink。');
assert(sidebar.includes('grid-template-rows: auto auto auto'), '订单栏头部应使用标题、副标题、导入按钮三行布局。');
assert(sidebar.includes('head-row') && sidebar.includes('head-title') && sidebar.includes('sidebar-subtitle'), '订单栏头部缺少横向标题行或副标题行。');
assert(sidebar.includes('white-space: nowrap') && sidebar.includes('word-break: keep-all') && sidebar.includes('overflow-wrap: normal'), '标题应禁止逐字断行。');
assert(sidebar.includes('-webkit-line-clamp: 2') && sidebar.includes('.sidebar-subtitle'), '副标题应存在两行内的合理换行规则。');
assert(sidebar.includes('.collapse-button') && !/collapse-button[\s\S]{0,160}bottom\s*:/.test(sidebar), '折叠按钮不应定位到头部底部。');
assert(sidebar.includes('.import-button') && sidebar.includes('width: 100%') && sidebar.includes('justify-content: center'), '导入订单按钮应独立成行并适配侧栏宽度。');
assert(sidebar.includes('.collapsed-rail span') && /collapsed-rail span[\s\S]{0,80}display:\s*none/.test(sidebar), '折叠状态不应保留文字。');
assert(sidebar.includes('.collapsed-rail small') && /collapsed-rail small[\s\S]{0,100}display:\s*none/.test(sidebar), '折叠状态不应保留今日/本周文字。');
assert(!/writing-mode:\s*vertical/.test(sidebar), '订单侧栏不得通过竖排文字实现折叠。');
assert(sidebar.includes('今日订单') && sidebar.includes('本周订单') && sidebar.includes('scope-tabs'), '今日/本周切换应继续存在。');
assert(sidebar.includes('data-scroll-key="orders"') && sidebar.includes('orders-${store.activeOrderScope}'), '订单列表应保持自身滚动 key。');

assert(card.includes('text-overflow: ellipsis') && card.includes('white-space: nowrap'), '长产品型号应使用省略号。');
assert(card.includes('.complete-button') && card.includes('min-width: 72px'), '完成按钮应保持独立宽度，不压缩型号区域。');
assert(card.includes('width: 100%') && card.includes('min-width: 0'), '订单卡片应填满侧栏且允许内部收缩。');

assert(!/new\s+PrismaClient|DATABASE_URL|Sealos|db push|migrate/i.test(inspected), '布局修复不得连接数据库或触碰 Sealos。');

for (const file of changedFiles()) {
  assert(!file.startsWith('apps/api/'), `不允许修改后端文件：${file}`);
  assert(!file.includes('prisma/'), `不允许修改 Prisma 文件：${file}`);
  assert(!file.includes('/connector/'), `不允许修改连接器文件：${file}`);
  assert(!file.includes('/fixture/'), `不允许修改治具文件：${file}`);
}

assert(packageJson.includes('"order-sidebar-layout:check": "node scripts/order-sidebar-layout-check.mjs"'), 'package.json 缺少 order-sidebar-layout:check。');

if (failures.length) {
  console.error('订单侧栏布局检查失败：');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('订单侧栏布局检查通过。');
