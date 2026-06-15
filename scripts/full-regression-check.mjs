import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();
const blockers = [];
const warnings = [];

function exists(relativePath) {
  return existsSync(join(root, relativePath));
}

function read(relativePath) {
  return exists(relativePath) ? readFileSync(join(root, relativePath), 'utf8') : '';
}

function requireFile(relativePath) {
  if (!exists(relativePath)) blockers.push(`缺少文件：${relativePath}`);
}

function requireIncludes(relativePath, text, message) {
  if (!read(relativePath).includes(text)) blockers.push(message);
}

function requireAnyIncludes(relativePath, texts, message) {
  const content = read(relativePath);
  if (!texts.some((text) => content.includes(text))) blockers.push(message);
}

function currentBranch() {
  try {
    return execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

const packageJson = JSON.parse(read('package.json'));
const scripts = packageJson.scripts ?? {};

[
  'auth-flow:check',
  'import-flow:check',
  'maintenance-flow:check',
  'knowledge-flow:check',
  'knowledge-validation:check',
  'execution-flow:check',
  'analytics-flow:check',
  'demo:release-check',
  'demo:freeze-check',
  'security:check',
  'full-regression:check',
  'data-consistency:check',
  'acceptance:report',
].forEach((name) => {
  if (!scripts[name]) blockers.push(`缺少 package script：${name}`);
});

[
  'apps/api/src/system-qa/system-qa.module.ts',
  'apps/api/src/system-qa/system-qa.controller.ts',
  'apps/api/src/system-qa/system-qa.service.ts',
  'apps/api/src/system-qa/helpers/data-consistency-checker.ts',
  'apps/api/src/system-qa/helpers/permission-regression-checker.ts',
  'apps/api/src/system-qa/helpers/business-flow-checker.ts',
  'apps/api/src/system-qa/helpers/demo-readiness-checker.ts',
  'apps/api/src/system-qa/helpers/acceptance-report-builder.ts',
  'apps/tablet/src/components/systemqa/WarmSystemQaDialog.vue',
  'apps/tablet/src/stores/system-qa-store.ts',
  'docs/release-notes-v2.7.md',
  'docs/v2.7-full-regression-qa.md',
  'docs/sealos-gap-analysis-v2.7.md',
].forEach(requireFile);

[
  "Get('overview')",
  "Get('data-consistency')",
  "Get('business-flow')",
  "Get('permission-regression')",
  "Get('demo-readiness')",
  "Get('acceptance-report')",
  "Get('acceptance-report/text')",
].forEach((needle) => requireIncludes('apps/api/src/system-qa/system-qa.controller.ts', needle, `system-qa API 缺少路由：${needle}`));

[
  'getSystemQaOverview',
  'getSystemQaDataConsistency',
  'getSystemQaBusinessFlow',
  'getSystemQaPermissionRegression',
  'getSystemQaDemoReadiness',
  'getSystemQaAcceptanceReport',
  'getSystemQaAcceptanceReportText',
].forEach((needle) => requireIncludes('apps/tablet/src/services/api.ts', needle, `前端 API service 缺少：${needle}`));

requireAnyIncludes('apps/tablet/src/config/app-version.ts', ["APP_VERSION = 'V2.7'", "APP_VERSION = 'V3.1'"], '版本信息不是 V2.7 或后续已验收版本。');
requireAnyIncludes('apps/tablet/src/config/app-version.ts', ['mock-local-full-regression-candidate', 'mock-local-field-pilot-config', 'mock-local-custom-baseline'], '构建通道不是已允许的回归/试运行/定制基线通道。');
requireIncludes('apps/tablet/src/components/warm/WarmStatusBar.vue', '全流程总验收', '演示工具菜单缺少全流程总验收入口。');
requireIncludes('apps/tablet/src/views/TabletDashboard.vue', 'WarmSystemQaDialog', '平板主界面未挂载总验收面板。');
requireIncludes('README.md', 'V2.7 全流程回归候选版', 'README 缺少 V2.7 说明。');
requireIncludes('.gitignore', 'apps/api/storage/metadata/documents.json', '.gitignore 未忽略 documents.json。');
requireIncludes('.gitignore', 'apps/api/storage/metadata/demo-analytics-snapshot.json', '.gitignore 未忽略 analytics snapshot。');

if (!currentBranch().includes('v2-7') && !currentBranch().includes('v3-1')) warnings.push(`当前分支不是 V2.7/V3.1 命名：${currentBranch()}`);

console.log('V2.7+ 全流程回归检查');
console.log('该检查只读，不连接数据库，不执行 migrate / db push / seed，不删除文件。');

if (warnings.length) {
  console.log('\n提醒项：');
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (blockers.length) {
  console.log('\n阻塞项：');
  for (const blocker of blockers) console.log(`- ${blocker}`);
  process.exit(1);
}

console.log('\n全流程回归检查通过。');
