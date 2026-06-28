import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

const files = {
  dialog: 'apps/tablet/src/components/orders/WarmOrderImportDialog.vue',
  filePanel: 'apps/tablet/src/components/orders/WarmOrderImportFilePanel.vue',
  preview: 'apps/tablet/src/components/orders/WarmOrderImportPreview.vue',
  result: 'apps/tablet/src/components/orders/WarmOrderImportResult.vue',
  sidebar: 'apps/tablet/src/components/orders/WarmOrderSidebar.vue',
  store: 'apps/tablet/src/stores/document-hub-store.ts',
  api: 'apps/tablet/src/services/api.ts',
  packageJson: 'package.json',
};

for (const [label, relativePath] of Object.entries(files)) {
  assert(existsSync(join(root, relativePath)), `${label} 文件不存在：${relativePath}`);
}

const dialog = read(files.dialog);
const filePanel = read(files.filePanel);
const preview = read(files.preview);
const result = read(files.result);
const sidebar = read(files.sidebar);
const store = read(files.store);
const api = read(files.api);
const packageJson = read(files.packageJson);
const ui = [dialog, filePanel, preview, result, sidebar].join('\n');

assert(sidebar.includes('WarmOrderImportDialog') && sidebar.includes('导入订单') && sidebar.includes('FileSpreadsheet'), '侧栏应提供 XLSX 订单导入入口。');
assert(dialog.includes('1 选择文件') && dialog.includes('2 确认订单') && dialog.includes('3 导入结果'), '订单导入弹窗必须包含三阶段流程。');
assert(dialog.includes('store.applyOrderImport()') && dialog.includes('store.orderImportLoading'), '导入弹窗 Apply 必须走 Store 并防重复点击。');
assert(dialog.includes('needs_customer_confirmation') && dialog.includes('confirmedCustomerId') && dialog.includes('confirmedProductId'), '导入弹窗应阻止未确认多客户同型号直接 Apply。');

assert(filePanel.includes('今日订单') && filePanel.includes('本周订单'), '文件阶段应支持导入范围选择。');
assert(filePanel.includes('type="file"') && filePanel.includes('accept=".xlsx"'), '文件阶段应只选择 XLSX。');
assert(filePanel.includes('Excel 仅需一列“产品型号”'), '文件阶段必须说明只导入产品型号。');
assert(filePanel.includes('第一行表头：产品型号'), '文件阶段必须提供标准模板说明。');
assert(filePanel.includes('store.setOrderImportFile') && filePanel.includes('store.previewOrderImport()'), '文件阶段必须通过 Store 选择文件并调用 Preview。');

assert(preview.includes('将创建') && preview.includes('文件内重复') && preview.includes('已在进行中') && preview.includes('需确认客户') && preview.includes('未建档产品') && preview.includes('错误'), 'Preview 汇总不完整。');
assert(preview.includes('create_order') && preview.includes('already_active') && preview.includes('duplicate_in_file') && preview.includes('needs_customer_confirmation') && preview.includes('product_not_found') && preview.includes('error'), 'Preview 动作覆盖不完整。');
assert(preview.includes('创建订单') && preview.includes('进行中订单已存在') && preview.includes('文件内重复') && preview.includes('未建档，将以未发图导入'), 'Preview 中文动作映射不完整。');
assert(preview.includes("item.action === 'create_order' || item.action === 'product_not_found' || item.action === 'needs_customer_confirmation'"), 'Preview 选择规则不完整。');
assert(preview.includes('store.updateOrderImportItem') && preview.includes('store.loadOrderImportItemCandidates'), 'Preview 必须通过 Store 更新确认项并加载候选。');
assert(preview.includes('选择客户') && preview.includes('选择产品资料页'), 'Preview 应支持多客户同型号确认。');
assert(!preview.includes('{{ item.action }}') && !preview.includes('{{ data.action }}'), 'Preview 不应直接显示英文 action。');

assert(result.includes('创建成功') && result.includes('重复跳过') && result.includes('已存在') && result.includes('需确认') && result.includes('用户跳过') && result.includes('失败'), '结果阶段汇总不完整。');
assert(result.includes('store.resetOrderImport()') && result.includes('store.orderImportOpen = false'), '结果阶段应支持完成和继续导入。');

assert(api.includes('previewOrderImport') && api.includes('/document-hub/orders/import/preview') && api.includes('FormData'), 'Preview API 未正确接入。');
assert(api.includes('applyOrderImport') && api.includes('/document-hub/orders/import/apply'), 'Apply API 未正确接入。');
assert(store.includes('orderImportFile') && store.includes('previewOrderImportRequest') && store.includes('applyOrderImportRequest'), 'Store 导入状态或 API 调用缺失。');
assert(store.includes('订单导入预览已过期，请重新选择文件。'), '过期 Preview 中文提示缺失。');
assert(store.includes('该型号存在多个客户，请确认客户和产品资料页。'), '多客户同型号确认提示缺失。');
assert(store.includes('refreshOrdersAfterAction'), 'Apply 成功后必须刷新订单和总览。');

assert(!/localStorage\.setItem[\s\S]{0,120}orderImportFile|new\s+PrismaClient|DATABASE_URL|Sealos|db push|migrate/i.test([store, api, ui].join('\n')), '导入 UI 不得持久化 File、连接数据库或触碰 Sealos。');
assert(!/mock fallback|fake success|fake order|XLSX test/i.test([store, api, ui].join('\n')), '导入 UI 不得出现 mock fallback、假成功或测试文件逻辑。');
assert(packageJson.includes('"order-import-ui:check": "node scripts/order-import-ui-check.mjs"'), 'package.json 缺少 order-import-ui:check。');

if (failures.length) {
  console.error('订单导入界面检查失败：');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('订单导入界面检查通过。');
