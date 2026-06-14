import { existsSync, readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

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

function requireScript(scripts, name) {
  if (!scripts[name]) blockers.push(`缺少 package 脚本：${name}`);
}

function requireGitIgnore(content, pattern) {
  if (!content.includes(pattern)) blockers.push(`.gitignore 未覆盖：${pattern}`);
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
].forEach((pattern) => requireGitIgnore(gitignore, pattern));

if (!hasGithubActionsCi()) warnings.push('未检测到 GitHub Actions workflow。');

console.log('V2.1 demo release check');
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
console.log('- 平板真机验收资料维护中心');
console.log('- push 分支');
console.log('- 创建 PR 或继续开发');
