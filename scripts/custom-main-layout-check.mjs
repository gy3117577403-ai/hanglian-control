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
  'apps/tablet/src/views/TabletDashboard.vue',
  'apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue',
  'apps/tablet/src/components/hub/WarmFunctionOrb.vue',
  'apps/tablet/src/components/orders/WarmOrderSidebar.vue',
  'apps/tablet/src/components/drawing/WarmDrawingLibraryView.vue',
  'apps/tablet/src/components/unified/WarmUnifiedDocumentCenter.vue',
  'apps/tablet/src/components/unified/WarmDeletePasswordDialog.vue',
  'docs/v3.3-custom-main-document-layout.md',
].forEach(requireFile);

requireIncludes('package.json', '"custom-main-layout:check"', 'package.json is missing custom-main-layout:check.');
requireIncludes('apps/tablet/src/config/app-version.ts', "APP_VERSION = 'V3.3'", 'Tablet app version is not V3.3.');
if (!['mock-local-custom-main-document-layout', 'mock-local-game-doc-hub-orders'].some((text) => read('apps/tablet/src/config/app-version.ts').includes(text))) {
  blockers.push('Build channel is not a custom V3.3 main layout channel.');
}
if (!['WarmUnifiedDocumentCenter', 'WarmDocumentHubDashboard'].some((text) => read('apps/tablet/src/views/TabletDashboard.vue').includes(text))) {
  blockers.push('/tablet does not render a custom main workspace.');
}

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
});

const mainFiles = [
  'apps/tablet/src/views/TabletDashboard.vue',
  'apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue',
  'apps/tablet/src/components/hub/WarmHubHeader.vue',
  'apps/tablet/src/components/hub/WarmHubContent.vue',
  'apps/tablet/src/components/orders/WarmOrderSidebar.vue',
  'apps/tablet/src/components/drawing/WarmDrawingLibraryView.vue',
].map((path) => read(path)).join('\n');

[
  'API 在线',
  'Mock 数据源',
  '演示工具',
  '现场模式',
  '未接 Sealos',
  '生产任务队列',
  '组长确认',
  '统计看板',
  '现场日报',
  '班组交接',
].forEach((text) => {
  if (mainFiles.includes(text)) blockers.push(`Main page still contains hidden label: ${text}`);
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
  if (mainFiles.includes(text)) blockers.push(`Main page source must not contain database command or secret marker: ${text}`);
});

console.log('V3.3 custom main layout check');
console.log('This check is read-only. It does not connect to a database and does not write data.');

if (blockers.length) {
  console.log('\nBlockers:');
  for (const blocker of blockers) console.log(`- ${blocker}`);
  process.exit(1);
}

console.log('\nV3.3 custom main layout check passed.');
