import { existsSync, readFileSync, readdirSync } from 'node:fs';
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
  if (!exists(relativePath)) blockers.push(`Missing file: ${relativePath}`);
}

function requireScript(scripts, name) {
  if (!scripts[name]) blockers.push(`Missing package script: ${name}`);
}

function requireGitIgnore(content, pattern) {
  if (!content.includes(pattern)) blockers.push(`.gitignore does not ignore: ${pattern}`);
}

function currentBranch() {
  try {
    return execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function hasGithubActionsCi() {
  const workflowDir = join(root, '.github', 'workflows');
  if (!existsSync(workflowDir)) return false;
  return readdirSync(workflowDir).some((file) => /\.(ya?ml)$/i.test(file));
}

const packageJson = JSON.parse(read('package.json'));
const scripts = packageJson.scripts ?? {};
const gitignore = read('.gitignore');
const versionConfig = read('apps/tablet/src/config/app-version.ts');

[
  'README.md',
  'docs/tablet-field-test-guide.md',
  'docs/file-flow-design.md',
  'docs/v1.5-tablet-field-qa.md',
  'docs/v1.6-demo-release-polish.md',
  'docs/v1.7-demo-management.md',
  'docs/v1.8-demo-freeze-qa.md',
  'docs/v1.9-pwa-tablet-package.md',
  'docs/v2.0-data-import-center.md',
  'docs/v2.1-maintenance-center.md',
  'docs/v2.2-role-permission.md',
  'docs/v2.3-fixture-quality-knowledge.md',
  'docs/v2.4-knowledge-field-validation.md',
  'docs/v2.5-production-execution-flow.md',
  'docs/v2.6-dashboard-analytics.md',
  'docs/v2.7-full-regression-qa.md',
  'docs/release-notes-v2.7.md',
  'docs/sealos-gap-analysis-v2.7.md',
  'docs/analytics-guide.md',
  'docs/execution-flow-guide.md',
  'docs/knowledge-library-guide.md',
  'docs/permission-matrix.md',
  'docs/import-template-guide.md',
  'docs/maintenance-guide.md',
  'docs/tablet-install-guide.md',
  'docs/release-notes-v1.8.md',
  'docs/pre-merge-checklist.md',
  'apps/tablet/src/config/app-version.ts',
].forEach(requireFile);

[
  'demo:assets',
  'demo:check',
  'demo:release-check',
  'demo:freeze-check',
  'demo:imports',
  'import-flow:check',
  'maintenance-flow:check',
  'auth-flow:check',
  'knowledge-flow:check',
  'knowledge-validation:check',
  'execution-flow:check',
  'analytics-flow:check',
  'full-regression:check',
  'data-consistency:check',
  'acceptance:report',
  'demo:analytics',
  'demo:knowledge',
  'file-flow:check',
  'dev:lan',
  'security:check',
  'build',
  'check',
].forEach((name) => requireScript(scripts, name));

[
  'apps/api/.env.local',
  'apps/api/storage/uploads/*',
  'apps/api/storage/metadata/documents.json',
  'apps/api/storage/metadata/audit-logs.json',
  'apps/api/storage/metadata/import-records.json',
  'apps/api/storage/metadata/imported-business-data.json',
  'apps/api/storage/metadata/import-previews.json',
  'apps/api/storage/metadata/maintenance-records.json',
  'apps/api/storage/metadata/knowledge-fixtures.json',
  'apps/api/storage/metadata/knowledge-abnormal-cases.json',
  'apps/api/storage/metadata/knowledge-quality-standards.json',
  'apps/api/storage/metadata/knowledge-records.json',
  'apps/api/storage/metadata/execution-records.json',
  'apps/api/storage/metadata/plan-status-events.json',
  'apps/api/storage/metadata/quantity-reports.json',
  'apps/api/storage/metadata/shift-handover-records.json',
  'apps/api/storage/metadata/demo-analytics-snapshot.json',
].forEach((pattern) => requireGitIgnore(gitignore, pattern));

if (!hasGithubActionsCi()) warnings.push('GitHub Actions workflow not detected.');
if (!["APP_VERSION = 'V2.7'", "APP_VERSION = 'V3.1'"].some((text) => versionConfig.includes(text))) {
  blockers.push('Version config is not an accepted V2.7+ release version.');
}
if (
  ![
    "APP_RELEASE_NAME = '线束车间平板管控系统全流程回归候选版'",
    "APP_RELEASE_NAME = '线束车间现场试运行配置版'",
    "APP_RELEASE_NAME = '线束车间定制开发基线版'",
  ].some((text) => versionConfig.includes(text))
) {
  blockers.push('Release name is not an accepted regression, field pilot, or custom baseline release.');
}

console.log('V2.7 demo release check');
console.log('This check is read-only. It does not connect to a database, run migrations, db push, seed, or delete files.');
console.log(`Current branch: ${currentBranch()}`);

if (warnings.length) {
  console.log('\nWarnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (blockers.length) {
  console.log('\nBlockers:');
  for (const blocker of blockers) console.log(`- ${blocker}`);
  process.exit(1);
}

console.log('\nDemo release check passed.');
console.log('\nSuggested next steps:');
console.log('- Complete V2.7 full regression walk-through on tablet.');
console.log('- Push only after local checks and safety review pass.');
