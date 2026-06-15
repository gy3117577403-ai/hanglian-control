import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];

function exists(path) {
  return existsSync(join(root, path));
}

function read(path) {
  return exists(path) ? readFileSync(join(root, path), 'utf8') : '';
}

function scriptExists(name) {
  try {
    const pkg = JSON.parse(read('package.json'));
    return Boolean(pkg.scripts?.[name]);
  } catch {
    return false;
  }
}

function add(label, ok, message, level = 'error') {
  if (ok) return;
  const line = `${label}: ${message}`;
  if (level === 'warning') warnings.push(line);
  else errors.push(line);
}

[
  ['login/auth', exists('apps/api/src/auth/auth.module.ts') && exists('apps/tablet/src/stores/auth-store.ts')],
  ['plan dashboard', exists('apps/tablet/src/components/warm/WarmPlanRail.vue')],
  ['upload preview', exists('apps/tablet/src/components/document/WarmPdfPreview.vue') && exists('apps/api/src/documents/documents.module.ts')],
  ['file health', exists('apps/api/src/files/files.module.ts') || exists('apps/api/src/documents/documents.controller.ts')],
  ['import center', exists('apps/tablet/src/components/imports/WarmImportCenterDialog.vue')],
  ['maintenance center', exists('apps/tablet/src/components/maintenance/WarmMaintenanceCenterDialog.vue')],
  ['knowledge', exists('apps/tablet/src/components/knowledge/WarmKnowledgePanel.vue')],
  ['execution', exists('apps/tablet/src/components/execution/WarmExecutionPanel.vue')],
  ['analytics', exists('apps/tablet/src/components/analytics/WarmAnalyticsDashboardDialog.vue')],
  ['settings center', exists('apps/tablet/src/components/settings/WarmSettingsCenterDialog.vue')],
  ['demo tools', exists('apps/tablet/src/components/warm/WarmStatusBar.vue')],
  ['dev:lan', scriptExists('dev:lan')],
  ['security ignore', read('.gitignore').includes('apps/api/storage/metadata/settings-records.json')],
].forEach(([label, ok]) => add(label, ok, 'required field pilot capability missing'));

const statusBar = read('apps/tablet/src/components/warm/WarmStatusBar.vue');
add('settings menu entry', statusBar.includes('open-settings-center'), 'settings center is not linked in demo tools');
add('feedback menu entry', statusBar.includes('open-system-feedback'), 'system feedback is not linked in demo tools');
add('pilot menu entry', statusBar.includes('open-pilot-check'), 'pilot check is not linked in demo tools');

console.log('V3.1 field pilot check');
console.log('This script is read-only and does not connect to a database or write to a database.');
console.log(`Warnings: ${warnings.length}`);
console.log(`Errors: ${errors.length}`);
if (warnings.length) {
  console.log('\nWarnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
}
if (errors.length) {
  console.log('\nErrors:');
  for (const error of errors) console.log(`- ${error}`);
  process.exit(1);
}
console.log('V3.1 field pilot check passed.');
