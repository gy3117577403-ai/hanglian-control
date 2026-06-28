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

function vueStyle(source) {
  const match = source.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  return match?.[1] ?? '';
}

function styleBlock(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...css.matchAll(new RegExp(`(^|\\n)\\s*${escapedSelector}\\s*\\{`, 'g'))];
  const match = matches.at(-1);
  const start = match ? (match.index + match[0].lastIndexOf(selector)) : -1;
  if (start < 0) return '';
  const braceStart = css.indexOf('{', start);
  if (braceStart < 0) return '';
  let depth = 0;
  for (let index = braceStart; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(braceStart + 1, index);
    }
  }
  return '';
}

function numericCssValue(block, property) {
  const match = block.match(new RegExp(`${property}:\\s*(\\d+)px`));
  return match ? Number(match[1]) : Number.NaN;
}

function hasFixedHeight(block) {
  return /(^|[\s;])height:\s*(?!auto\b)\d+px/.test(block);
}

const files = {
  dashboard: 'apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue',
  sidebar: 'apps/tablet/src/components/orders/WarmOrderSidebar.vue',
  card: 'apps/tablet/src/components/orders/WarmOrderCard.vue',
  statusMenu: 'apps/tablet/src/components/orders/WarmOrderStatusMenu.vue',
  orderMetadataStore: 'apps/api/src/document-hub/order-metadata.store.ts',
  packageJson: 'package.json',
};

for (const [label, relativePath] of Object.entries(files)) {
  assert(existsSync(join(root, relativePath)), `${label} 文件不存在：${relativePath}`);
}

const dashboard = read(files.dashboard);
const sidebar = read(files.sidebar);
const card = read(files.card);
const statusMenu = read(files.statusMenu);
const orderMetadataStore = read(files.orderMetadataStore);
const packageJson = read(files.packageJson);

const dashboardCss = vueStyle(dashboard);
const sidebarCss = vueStyle(sidebar);
const cardCss = vueStyle(card);
const statusMenuCss = vueStyle(statusMenu);
const inspected = [dashboard, sidebar, card, statusMenu].join('\n');

const sidebarRootStyle = styleBlock(sidebarCss, '.order-sidebar');
const orderListStyle = styleBlock(sidebarCss, '.order-list');
const collapsedRailSpanStyle = styleBlock(sidebarCss, '.collapsed-rail span');
const collapsedRailSmallStyle = styleBlock(sidebarCss, '.collapsed-rail small');
const orderCardStyle = styleBlock(cardCss, '.order-card');
const footerStyle = styleBlock(cardCss, '.order-card__footer');
const statusNoteStyle = styleBlock(cardCss, '.status-note');
const completeButtonStyle = styleBlock(cardCss, '.complete-button');
const statusMenuStyle = styleBlock(statusMenuCss, '.order-status-menu');
const statusDisplayStyle = styleBlock(statusMenuCss, '.status-display');
const statusPillStyle = styleBlock(statusMenuCss, '.status-pill');
const statusSwitchStyle = styleBlock(statusMenuCss, '.status-switch');

assert(/--order-column-width:\s*28[0-9]px/.test(dashboard), '展开订单栏宽度应为 270px-290px。');
assert(/orders-collapsed[\s\S]{0,80}--order-column-width:\s*6[0-9]px/.test(dashboard), '折叠状态宽度应约 56px-72px。');
assert(dashboard.includes('grid-template-columns: var(--order-column-width) minmax(0, 1fr)'), '主页面应使用稳定双栏 grid。');
assert(dashboard.includes('.hub-body > *') && dashboard.includes('min-width: 0'), '主内容应设置 min-width: 0。');
assert(dashboardCss.includes('overflow: hidden'), '主页面内容区应禁止页面级横向滚动。');

assert(sidebarRootStyle.includes('flex-shrink: 0'), '订单侧栏应禁止 flex shrink。');
assert(sidebar.includes('scope-tabs') && sidebar.includes('今日订单') && sidebar.includes('本周订单'), '今日/本周切换应继续存在。');
assert(sidebar.includes('data-scroll-key="orders"') && sidebar.includes('orders-${store.activeOrderScope}'), '订单列表应保持自身滚动 key。');
assert(orderListStyle.includes('flex: 1'), '订单列表应作为侧栏剩余空间的独立滚动区。');
assert(orderListStyle.includes('min-height: 0'), '订单列表应允许在 grid/flex 容器内收缩。');
assert(orderListStyle.includes('overflow-y: auto'), '订单列表应独立纵向滚动。');
assert(orderListStyle.includes('overflow-x: hidden'), '订单列表不应产生横向滚动。');
assert(/padding-bottom:\s*24px/.test(orderListStyle), '订单列表底部应保留 24px 安全空间。');
assert(/gap:\s*(1[0-9]|2[0-4])px/.test(orderListStyle), '订单卡片间距至少应为 10px。');

assert(collapsedRailSpanStyle.includes('display: none'), '折叠状态不应显示压缩文字。');
assert(collapsedRailSmallStyle.includes('display: none'), '折叠状态不应显示今日/本周文字。');
assert(!/writing-mode:\s*vertical/.test(sidebarCss), '订单侧栏不得使用竖排文字模拟折叠。');

assert(orderMetadataStore.includes('normalizeOrderProductionStatus'), '订单 metadata 必须存在生产状态规范化规则。');
assert(orderMetadataStore.includes("input.completionStatus === 'pending'"), '生产状态规范化必须只自动校正 pending 订单。');
assert(orderMetadataStore.includes("input.productResolutionStatus !== 'found'") && orderMetadataStore.includes('!input.linkedProductId'), '未建档或未绑定产品的 pending 订单必须映射为 no_drawing。');
assert(orderMetadataStore.includes("return 'no_drawing'"), '未建档订单必须返回 no_drawing。');
assert(!/completionStatus\s*===\s*'completed'[\s\S]{0,160}return 'no_drawing'/.test(orderMetadataStore), 'completed 历史订单不得被自动改写为 no_drawing。');

for (const area of ['order-card__header', 'order-card__binding', 'order-card__status', 'order-card__footer']) {
  assert(card.includes(`class="${area}"`), `订单卡片缺少独立区域：${area}`);
}

assert(orderCardStyle.includes('display: grid'), '订单卡片应使用 grid 文档流布局。');
assert(orderCardStyle.includes('grid-template-rows: auto auto auto auto'), '订单卡片应固定为四层文档流。');
assert(orderCardStyle.includes('height: auto'), '订单卡片应使用 height:auto。');
assert(!hasFixedHeight(orderCardStyle), '订单卡片不得使用固定 height。');
assert(numericCssValue(orderCardStyle, 'min-height') >= 158, '订单卡片 min-height 应不小于 158px。');
assert(orderCardStyle.includes('overflow: visible'), '订单卡片不得用 overflow:hidden 裁切内容。');
assert(!/overflow:\s*hidden/.test(orderCardStyle), '订单卡片不得裁切交互内容。');
assert(!/contain:\s*layout paint/.test(orderCardStyle), '订单卡片不得使用 paint contain 裁切状态控件。');
assert(!/margin-(top|bottom):\s*-/.test(cardCss), '订单卡片不应使用负 margin 修补布局。');
assert(!/transform:\s*translate/.test(orderCardStyle), '订单卡片主体不应使用 transform 位移修补布局。');

assert(card.includes('quantity-chip') && card.includes('数量未填写'), '第一层应包含型号与数量标签。');
assert(card.includes('customer-name') && card.includes('binding-area') && card.includes('资料：'), '第二层应包含客户与资料状态。');
assert(card.includes("label: '档✓'") && card.includes("label: '档×'"), '已绑定和未建档资料状态应使用紧凑字符显示。');
assert(!card.includes('资料：{{ bindingState(order).label }}'), '资料状态不得继续在卡片中显示长文案。');
assert(card.includes('status-slot') && card.includes('WarmOrderStatusMenu'), '第三层应包含生产状态菜单。');
assert(card.includes('status-note') && card.includes('complete-button'), '第四层应包含提示与完成按钮。');
assert(card.includes('产品未建档，暂不可切换') && card.includes('无原图，暂不可切换'), '提示文案应改为紧凑短句。');
assert(statusNoteStyle.includes('overflow: hidden'), '提示文案应限制为单行省略。');
assert(statusNoteStyle.includes('text-overflow: ellipsis'), '提示文案应使用省略号。');
assert(statusNoteStyle.includes('white-space: nowrap'), '提示文案不得铺满多行。');
assert(statusNoteStyle.includes('min-width: 0'), '提示文案所在区域应允许收缩。');

assert(footerStyle.includes('grid-template-columns: minmax(0, 1fr) auto'), '完成按钮应独立位于第四层右侧。');
assert(!/position:\s*absolute/.test(completeButtonStyle), '完成按钮不得使用 absolute。');
assert(numericCssValue(completeButtonStyle, 'width') >= 72 && numericCssValue(completeButtonStyle, 'width') <= 80, '完成按钮宽度应为 72px-80px。');
assert(numericCssValue(completeButtonStyle, 'min-height') >= 38 && numericCssValue(completeButtonStyle, 'min-height') <= 40, '完成按钮高度应为 38px-40px。');
assert(Number.isNaN(numericCssValue(completeButtonStyle, 'max-height')) || numericCssValue(completeButtonStyle, 'max-height') <= 40, '完成按钮高度不得超过 40px。');
assert(!/width:\s*8[1-9]px|width:\s*9[0-9]px|width:\s*[1-9]\d{2,}px/.test(completeButtonStyle), '完成按钮不得超过 80px。');

assert(statusMenu.includes('在前端') && statusMenu.includes('在后端') && statusMenu.includes('未发图'), '生产状态必须完整映射为中文。');
assert(statusMenu.includes('class="status-display"') && statusMenu.includes('class="status-prefix"') && statusMenu.includes('class="status-pill"'), '生产状态左侧应为“生产 + 状态标签”。');
assert(statusMenu.includes('生产状态</span>'), '生产状态前缀必须完整显示“生产状态”。');
assert(statusMenuStyle.includes('grid-template-columns: minmax(0, 1fr) 58px'), '生产状态行应为左状态、右 58px 切换按钮的两列。');
assert(statusDisplayStyle.includes('display: flex'), '生产状态左侧应使用 flex 横向排列。');
assert(statusDisplayStyle.includes('white-space: nowrap'), '生产状态不得逐字断行。');
assert(statusPillStyle.includes('flex-shrink: 0'), '生产状态标签不得被压缩。');
assert(numericCssValue(statusPillStyle, 'height') >= 30 && numericCssValue(statusPillStyle, 'height') <= 34, '状态标签高度应为 30px-34px。');
assert(numericCssValue(statusPillStyle, 'min-width') >= 60, '状态标签应有足够最小宽度。');
assert(statusPillStyle.includes('white-space: nowrap'), '状态标签文字必须保持横向完整显示。');

assert(statusMenu.includes('status-switch') && statusMenu.includes('aria-label="切换生产状态"'), '切换按钮必须可见并可访问。');
assert(statusMenu.includes('<button') && statusMenu.includes('class="status-switch"'), '切换入口应是只显示“切换”的紧凑按钮。');
assert(!statusMenu.includes('<select'), '切换按钮内不得再嵌入原生 select，避免露出残余选项文字。');
assert(!/flex:\s*1/.test(statusSwitchStyle), '切换按钮不得使用 flex: 1。');
assert(!/position:\s*absolute/.test(statusSwitchStyle) && !/position:\s*absolute/.test(statusMenuCss), '切换按钮和状态菜单不得使用 absolute。');
assert(!/margin-(left|right|top|bottom):\s*-/.test(statusSwitchStyle), '切换按钮不得使用负 margin。');
assert(numericCssValue(statusSwitchStyle, 'width') === 58, '切换按钮宽度应为 58px。');
assert(numericCssValue(statusSwitchStyle, 'min-height') === 34, '切换按钮高度应为 34px。');
assert(statusSwitchStyle.includes('flex-shrink: 0'), '切换按钮不得被压缩。');
assert(statusSwitchStyle.includes('white-space: nowrap'), '切换按钮文字必须完整显示。');
assert(statusMenu.includes('PrimeMenu') && statusMenu.includes('append-to="body"'), '状态弹出菜单必须 append 到 body，避免被侧栏 overflow 裁切。');
assert(statusMenu.includes('当前产品尚无原图，不能切换生产状态。'), '无原图状态应保留完整 Tooltip 原因。');
assert(!/front\/back|front\s*}}|back\s*}}|no_drawing\s*}}/.test(statusMenu), '状态区不得显示英文内部状态。');

assert(card.includes('资料：') && statusMenu.includes('生产'), '产品资料状态和生产状态必须分别存在。');
assert(card.includes('已绑定资料页') && card.includes('产品未建档') && card.includes('客户未建档') && card.includes('需确认客户'), '资料状态应保留完整中文枚举。');
assert(card.includes('text-overflow: ellipsis') && card.includes('white-space: nowrap'), '长产品型号应使用省略号。');
assert(card.includes('width: 100%') && card.includes('min-width: 0'), '订单卡片应填满侧栏且允许内部收缩。');

assert(!/new\s+PrismaClient|DATABASE_URL|Sealos|db push|migrate/i.test(inspected), '布局修复不得连接数据库或触碰 Sealos。');

const v315PerformanceFiles = [
  'apps/tablet/src/App.vue',
  'apps/tablet/src/main.ts',
  'apps/tablet/src/styles/tablet-performance.css',
  'apps/tablet/src/composables/use-pdf-cover-queue.ts',
  'apps/tablet/src/composables/use-progressive-list.ts',
  'apps/tablet/src/composables/use-tablet-performance.ts',
  'apps/tablet/src/components/document/WarmImagePreview.vue',
  'apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue',
  'apps/tablet/src/components/drawing/WarmImageDetailViewer.vue',
  'apps/tablet/src/components/drawing/WarmModuleCoverPreview.vue',
  'apps/tablet/src/components/drawing/WarmPdfFirstPagePreview.vue',
  'apps/tablet/src/components/drawing/WarmProductDrawingHome.vue',
  'apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue',
  'apps/tablet/src/components/hub/WarmFunctionOrb.vue',
  'apps/tablet/src/components/hub/WarmHubContent.vue',
  'apps/tablet/src/components/hub/WarmHubHeader.vue',
  'apps/tablet/src/components/hub/WarmHubSearchBar.vue',
  'apps/tablet/src/components/maintenance/WarmCustomerListPanel.vue',
  'apps/tablet/src/components/maintenance/WarmProductListPanel.vue',
  'apps/tablet/src/components/search/WarmDrawingSearchResultItem.vue',
  'apps/tablet/src/components/search/WarmDrawingSearchResults.vue',
  'apps/tablet/src/components/trash/WarmDrawingTrashDialog.vue',
  'apps/tablet/src/components/trash/WarmTrashDocumentCard.vue',
  'apps/tablet/src/components/upload/WarmCameraCaptureDialog.vue',
  'apps/tablet/src/components/upload/WarmUploadPreviewGrid.vue',
  'apps/tablet/src/components/viewer/WarmImageThumbnail.vue',
  'apps/tablet/src/components/viewer/WarmImageViewer.vue',
  'scripts/pdf-cover-performance-check.mjs',
  'scripts/tablet-production-performance-smoke.mjs',
  'scripts/tablet-scroll-performance-check.mjs',
  'scripts/tablet-visual-performance-check.mjs',
  'package.json',
];
const v316AndroidFoundationFiles = [
  '.gitignore',
  'README.md',
  'package.json',
  'package-lock.json',
  'apps/tablet/.env.android.example',
  'apps/tablet/capacitor.config.ts',
  'apps/tablet/package.json',
  'apps/tablet/src/App.vue',
  'apps/tablet/src/components/native/WarmNativeNetworkBanner.vue',
  'apps/tablet/src/components/warm/WarmStatusBar.vue',
  'apps/tablet/src/config/api-base.ts',
  'apps/tablet/src/main.ts',
  'apps/tablet/src/native/android-back-handler.ts',
  'apps/tablet/src/native/native-network.ts',
  'apps/tablet/src/native/native-platform.ts',
  'apps/tablet/src/native/native-shell.ts',
  'apps/tablet/src/services/api.ts',
  'apps/tablet/src/style.css',
  'apps/tablet/vite.config.ts',
  'docs/android-debug-install-guide.md',
  'docs/project-status.md',
  'docs/v3.16-android-app-foundation.md',
  'scripts/android-app-foundation-check.mjs',
  'scripts/android-back-navigation-check.mjs',
  'scripts/android-gradle.mjs',
  'scripts/native-api-config-check.mjs',
  'scripts/native-network-check.mjs',
];
const v316NativeConnectorFiles = [
  'apps/tablet/src/components/connector/WarmConnectorDetailDialog.vue',
  'apps/tablet/src/components/connector/WarmConnectorParameterView.vue',
  'apps/tablet/src/components/connector/WarmConnectorTable.vue',
  'apps/tablet/src/components/fixture/WarmFixtureParameterView.vue',
  'apps/tablet/src/components/drawing/WarmDrawingLibraryView.vue',
  'apps/tablet/src/composables/use-native-app-viewport.ts',
  'apps/tablet/src/composables/use-native-viewport.ts',
  'apps/tablet/src/composables/use-idle-prefetch.ts',
  'apps/tablet/src/composables/use-native-mode-cache.ts',
  'apps/tablet/src/composables/use-stale-while-revalidate.ts',
  'apps/tablet/src/styles/native-connector-light.css',
  'apps/tablet/src/styles/native-fixed-viewport.css',
  'apps/tablet/src/styles/native-header-layout.css',
  'apps/tablet/src/styles/native-interaction-lock.css',
  'apps/tablet/src/styles/native-switch-performance.css',
  'apps/tablet/src/stores/document-hub-store.ts',
  'scripts/frontend-lazy-loading-check.mjs',
  'scripts/product-detail-cache-check.mjs',
  'scripts/android-built-assets-check.mjs',
  'scripts/native-cache-first-check.mjs',
  'scripts/native-connector-layout-check.mjs',
  'scripts/native-connector-scroll-check.mjs',
  'scripts/native-connector-light-check.mjs',
  'scripts/native-connector-runtime-check.mjs',
  'scripts/native-header-layout-check.mjs',
  'scripts/native-fixed-viewport-check.mjs',
  'scripts/native-interaction-lock-check.mjs',
  'scripts/native-mode-switch-check.mjs',
  'scripts/native-viewport-stability-check.mjs',
  'scripts/native-webview-zoom-check.mjs',
];

const allowedChangedFiles = new Set([
  'apps/tablet/src/components/orders/WarmOrderCard.vue',
  'apps/tablet/src/components/orders/WarmOrderStatusMenu.vue',
  'apps/tablet/src/components/orders/WarmOrderSidebar.vue',
  'apps/api/src/document-hub/order-metadata.store.ts',
  'scripts/camera-upload-check.mjs',
  'scripts/document-home-preview-check.mjs',
  'scripts/document-viewer-foundation-check.mjs',
  'scripts/document-viewer-thumbnail-check.mjs',
  'scripts/drawing-service-store-check.mjs',
  'scripts/order-frontend-state-check.mjs',
  'scripts/order-sidebar-layout-check.mjs',
  'scripts/pdf-import-frontend-state-check.mjs',
  'scripts/pdf-import-ui-check.mjs',
  'scripts/security-check.mjs',
  ...v315PerformanceFiles,
  ...v316AndroidFoundationFiles,
  ...v316NativeConnectorFiles,
]);

for (const file of changedFiles()) {
  const allowedByAndroidPrefix = file.startsWith('apps/tablet/android/');
  const allowedByNativePrefix = file.startsWith('apps/tablet/src/components/native/') || file.startsWith('apps/tablet/src/native/') || file.startsWith('apps/tablet/src/components/connectors/');
  assert(allowedChangedFiles.has(file) || allowedByAndroidPrefix || allowedByNativePrefix, `本轮不允许修改该文件：${file}`);
  assert(!file.startsWith('apps/api/') || file === 'apps/api/src/document-hub/order-metadata.store.ts', `不允许修改后端文件：${file}`);
  assert(!file.includes('prisma/'), `不允许修改 Prisma 文件：${file}`);
  assert(!file.includes('/connector/') || v316NativeConnectorFiles.includes(file), `不允许修改连接器文件：${file}`);
  assert(!file.includes('/fixture/') || file === 'apps/tablet/src/components/fixture/WarmFixtureParameterView.vue', `不允许修改治具文件：${file}`);
}

assert(packageJson.includes('"order-sidebar-layout:check": "node scripts/order-sidebar-layout-check.mjs"'), 'package.json 缺少 order-sidebar-layout:check。');

if (failures.length) {
  console.error('订单侧栏布局检查失败：');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('订单侧栏布局检查通过。');
