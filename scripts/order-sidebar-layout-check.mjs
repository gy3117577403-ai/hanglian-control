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

function styleBlock(source, selector) {
  const start = source.indexOf(selector);
  if (start < 0) return '';
  const braceStart = source.indexOf('{', start);
  if (braceStart < 0) return '';
  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(braceStart + 1, index);
    }
  }
  return '';
}

const files = {
  dashboard: 'apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue',
  sidebar: 'apps/tablet/src/components/orders/WarmOrderSidebar.vue',
  card: 'apps/tablet/src/components/orders/WarmOrderCard.vue',
  statusMenu: 'apps/tablet/src/components/orders/WarmOrderStatusMenu.vue',
  packageJson: 'package.json',
};

for (const [label, relativePath] of Object.entries(files)) {
  assert(existsSync(join(root, relativePath)), `${label} 文件不存在：${relativePath}`);
}

const dashboard = read(files.dashboard);
const sidebar = read(files.sidebar);
const card = read(files.card);
const statusMenu = read(files.statusMenu);
const packageJson = read(files.packageJson);
const inspected = [dashboard, sidebar, card, statusMenu].join('\n');

const importButtonStyle = styleBlock(sidebar, '.import-button');
const sidebarHeadStyle = styleBlock(sidebar, '.sidebar-head');
const orderCardStyle = styleBlock(card, '.order-card');
const orderListStyle = styleBlock(sidebar, '.order-list');
const completeButtonStyle = styleBlock(card, '.complete-button');

assert(/--order-column-width:\s*28[0-9]px/.test(dashboard), '展开订单栏宽度应为 270px-290px。');
assert(/--order-column-width:\s*27[0-9]px/.test(dashboard) || /--order-column-width:\s*28[0-9]px/.test(dashboard), '窄屏订单栏宽度仍应为 270px-290px。');
assert(dashboard.includes('grid-template-columns: var(--order-column-width) minmax(0, 1fr)'), '主页面应使用稳定双栏 grid。');
assert(dashboard.includes('overflow: hidden'), '主页面内容区应禁止页面级横向滚动。');
assert(dashboard.includes('.hub-body > *') && dashboard.includes('min-width: 0'), '主内容应设置 min-width: 0。');
assert(/orders-collapsed[\s\S]{0,80}--order-column-width:\s*6[0-9]px/.test(dashboard), '折叠状态宽度应约 56-72px。');

assert(sidebar.includes('flex-shrink: 0'), '订单侧栏应禁止 flex shrink。');
assert(sidebar.includes('subtitle-row') && sidebar.includes('head-row') && sidebar.includes('scope-tabs'), '订单栏头部应为标题行、副标题/导入行、今日本周切换。');
assert(/max-height:\s*9[0-9]px/.test(sidebarHeadStyle), '订单栏标题区高度应保持紧凑，不得撑到 120px 以上。');
assert(sidebar.includes('white-space: nowrap') && sidebar.includes('word-break: keep-all') && sidebar.includes('overflow-wrap: normal'), '标题应禁止逐字断行。');
assert(sidebar.includes('-webkit-line-clamp: 2') && sidebar.includes('.sidebar-subtitle'), '副标题应存在两行内的合理换行规则。');
assert(sidebar.includes('.collapse-button') && !/collapse-button[\s\S]{0,160}bottom\s*:/.test(sidebar), '折叠按钮不应定位到头部底部。');

assert(importButtonStyle.includes('width: 104px') || /width:\s*(9[6-9]|10[0-9]|11[0-2])px/.test(importButtonStyle), '导入订单按钮宽度应约 96px-112px。');
assert(!/width:\s*100%/.test(importButtonStyle), '导入订单按钮不得继续使用 width: 100% 的大按钮布局。');
assert(/min-height:\s*(38|39|40|41|42)px/.test(importButtonStyle), '导入订单按钮高度应为 38px-42px。');
assert(/max-height:\s*42px/.test(importButtonStyle), '导入订单按钮高度不得超过合理范围。');
assert(importButtonStyle.includes('font-size: 12px'), '导入订单按钮应使用小字号。');
assert(!/linear-gradient\(145deg,\s*rgba\(229,\s*127,\s*50/.test(importButtonStyle), '导入订单按钮不得保留大面积主按钮渐变。');

assert(sidebar.includes('今日订单') && sidebar.includes('本周订单') && sidebar.includes('scope-tabs'), '今日/本周切换应继续存在。');
assert(/min-height:\s*40px/.test(styleBlock(sidebar, '.scope-tabs button')), '今日/本周切换高度应约 40px-44px。');
assert(sidebar.includes('data-scroll-key="orders"') && sidebar.includes('orders-${store.activeOrderScope}'), '订单列表应保持自身滚动 key。');
assert(orderListStyle.includes('overflow-y: auto') && orderListStyle.includes('padding-bottom: 22px'), '订单列表应独立滚动并保留底部 padding。');
assert(/gap:\s*(1[0-9]|2[0-4])px/.test(orderListStyle), '订单卡片间距至少应为 10px。');

assert(card.includes('WarmOrderStatusMenu'), 'WarmOrderStatusMenu 必须接入订单卡片。');
assert(orderCardStyle.includes('grid-template-rows: auto auto auto') || orderCardStyle.includes('flex-direction: column'), '订单卡片应按正常文档流自然撑开。');
assert(!/(^|[\s;])height:\s*\d+px/.test(orderCardStyle), '订单卡片不得使用会裁切内容的固定 height。');
assert(/min-height:\s*1(4[0-9]|5[0-9])px/.test(orderCardStyle), '订单卡片应使用足够的 min-height。');
assert(orderCardStyle.includes('overflow: visible'), '订单卡片内部不得使用错误 overflow:hidden 裁切状态控件。');
assert(!/contain:\s*layout paint/.test(orderCardStyle), '订单卡片不得使用 paint contain 裁切底部状态控件。');
assert(!/position:\s*absolute/.test(statusMenu), '状态菜单不得使用 absolute 定位。');

assert(card.includes('quantity-chip') && card.includes('binding') && card.includes('card-actions'), '型号/数量、资料状态、底部操作区应分层渲染。');
assert(card.includes('资料：') && statusMenu.includes('生产：'), '产品绑定状态和生产状态必须分别渲染。');
assert(statusMenu.includes('在前端') && statusMenu.includes('在后端') && statusMenu.includes('未发图'), '三种生产状态必须完整显示中文。');
assert(statusMenu.includes('status-switch') && statusMenu.includes('aria-label="切换生产状态"'), '状态切换入口必须可见。');
assert(statusMenu.includes('disabledReason') && statusMenu.includes('当前产品尚无原图，不能切换生产状态。'), '禁用状态必须保留原因提示。');
assert(!/front\/back|front\s*}}|back\s*}}|no_drawing\s*}}/.test(statusMenu), '状态区不得显示英文内部状态。');

assert(card.includes('grid-template-columns: minmax(0, 1fr) auto') && card.includes('status-slot'), '完成按钮和生产状态应位于不同布局区域。');
assert(/width:\s*82px/.test(completeButtonStyle) && /min-height:\s*40px/.test(completeButtonStyle), '完成按钮应保持 76px-88px 宽、38px-42px 高。');
assert(card.includes('text-overflow: ellipsis') && card.includes('white-space: nowrap'), '长产品型号应使用省略号。');
assert(card.includes('width: 100%') && card.includes('min-width: 0'), '订单卡片应填满侧栏且允许内部收缩。');

assert(sidebar.includes('.collapsed-rail span') && /collapsed-rail span[\s\S]{0,80}display:\s*none/.test(sidebar), '折叠状态不应保留文字。');
assert(sidebar.includes('.collapsed-rail small') && /collapsed-rail small[\s\S]{0,100}display:\s*none/.test(sidebar), '折叠状态不应保留今日/本周文字。');
assert(!/writing-mode:\s*vertical/.test(sidebar), '订单侧栏不得通过竖排文字实现折叠。');

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
