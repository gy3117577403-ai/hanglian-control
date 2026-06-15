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

const mainFiles = [
  'apps/tablet/src/views/TabletDashboard.vue',
  'apps/tablet/src/components/unified/WarmUnifiedDocumentCenter.vue',
  'apps/tablet/src/components/unified/WarmUnifiedSearchBar.vue',
  'apps/tablet/src/components/unified/WarmUnifiedFilterPanel.vue',
  'apps/tablet/src/components/unified/WarmUnifiedResultList.vue',
  'apps/tablet/src/components/unified/WarmUnifiedPreviewPanel.vue',
];

[
  ...mainFiles,
  'apps/tablet/src/components/unified/WarmUnifiedUploadDialog.vue',
  'apps/tablet/src/components/unified/WarmUnifiedEditDialog.vue',
  'apps/tablet/src/components/unified/WarmDeletePasswordDialog.vue',
  'apps/tablet/src/components/unified/WarmDeleteLockSetupDialog.vue',
  'apps/tablet/src/components/unified/WarmBulkActionBar.vue',
  'apps/tablet/src/stores/unified-document-store.ts',
  'docs/v3.3-custom-main-document-layout.md',
].forEach(requireFile);

requireIncludes('package.json', '"custom-main-layout:check"', 'package.json is missing custom-main-layout:check.');
requireIncludes('apps/tablet/src/config/app-version.ts', "APP_VERSION = 'V3.3'", 'Tablet app version is not V3.3.');
requireIncludes('apps/tablet/src/config/app-version.ts', 'mock-local-custom-main-document-layout', 'Build channel is not the V3.3 custom main layout channel.');
requireIncludes('apps/tablet/src/views/TabletDashboard.vue', 'WarmUnifiedDocumentCenter', '/tablet does not render the unified document center.');

[
  'WarmStatusBar',
  'WarmTopBar',
  'TopStatusBar',
  'WarmAppShell',
  'WarmPlanRail',
  'WarmExecutionPanel',
  'WarmAnalyticsDashboardDialog',
  'WarmLaunchScreen',
  'WarmDemoTools',
].forEach((text) => {
  requireNotIncludes('apps/tablet/src/views/TabletDashboard.vue', text, `/tablet still renders ${text}.`);
  requireNotIncludes('apps/tablet/src/components/unified/WarmUnifiedDocumentCenter.vue', text, `Unified main center still renders ${text}.`);
});

requireNotIncludes('apps/tablet/src/components/unified/WarmUnifiedDocumentCenter.vue', 'WarmTrashDialog', 'Trash should be a main-list mode, not a main-page dialog.');
requireIncludes('apps/tablet/src/components/unified/WarmUnifiedDocumentCenter.vue', 'grid-template-columns', 'Unified main center is missing a three-column layout.');
requireIncludes('apps/tablet/src/components/unified/WarmUnifiedSearchBar.vue', '上传资料', 'Upload entry is missing from the main workspace.');
requireIncludes('apps/tablet/src/components/unified/WarmUnifiedFilterPanel.vue', '资料查询上传中心', 'Left rail is missing the unified document center title.');
requireIncludes('apps/tablet/src/components/unified/WarmUnifiedFilterPanel.vue', '回收站', 'Trash entry is missing from the left rail.');
requireIncludes('apps/tablet/src/components/unified/WarmUnifiedFilterPanel.vue', 'store.enterTrash', 'Trash entry does not switch the main result list.');
requireIncludes('apps/tablet/src/components/unified/WarmUnifiedResultList.vue', '暂无资料。可以先上传图纸、SOP、孔位图、成品图', 'Empty state does not guide upload/import fallback.');
requireIncludes('apps/tablet/src/components/unified/WarmUnifiedPreviewPanel.vue', '编辑资料', 'Right preview panel is missing edit action.');
requireIncludes('apps/tablet/src/components/unified/WarmUnifiedPreviewPanel.vue', '恢复资料', 'Right preview panel is missing restore action.');
requireIncludes('apps/tablet/src/components/unified/WarmUnifiedPreviewPanel.vue', '彻底删除', 'Right preview panel is missing protected purge action.');
requireIncludes('apps/tablet/src/components/unified/WarmDeletePasswordDialog.vue', 'password', 'Delete password dialog is missing.');

const mainSource = mainFiles.map((path) => read(path)).join('\n');
[
  '线束车间生产计划资料管控系统',
  'Mock 权限',
  '日期时间',
  'A班',
  '前段组长',
  '后段组长',
  'API 在线',
  'Mock 数据源',
  '演示工具',
  '现场模式',
  'Mock 演示',
  '未接 Sealos',
  '生产任务队列',
  '组长确认',
  '现场执行',
  '统计看板',
  '现场日报',
  '班组交接',
].forEach((text) => {
  if (mainSource.includes(text)) blockers.push(`Main page still contains hidden V3.2/V2.x label: ${text}`);
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

console.log('V3.3 custom main layout check');
console.log('This check is read-only. It does not connect to a database and does not write data.');

if (blockers.length) {
  console.log('\nBlockers:');
  for (const blocker of blockers) console.log(`- ${blocker}`);
  process.exit(1);
}

console.log('\nV3.3 custom main layout check passed.');
