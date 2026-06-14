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
const versionConfig = read('apps/tablet/src/config/app-version.ts');

[
  'README.md',
  'docs/release-notes-v1.8.md',
  'docs/pre-merge-checklist.md',
  'docs/tablet-field-test-guide.md',
  'docs/file-flow-design.md',
  'docs/v1.8-demo-freeze-qa.md',
  'docs/v1.9-pwa-tablet-package.md',
  'docs/v2.0-data-import-center.md',
  'docs/v2.1-maintenance-center.md',
  'docs/v2.2-role-permission.md',
  'docs/v2.3-fixture-quality-knowledge.md',
  'docs/knowledge-library-guide.md',
  'docs/permission-matrix.md',
  'docs/import-template-guide.md',
  'docs/maintenance-guide.md',
  'docs/tablet-install-guide.md',
  'apps/tablet/src/config/app-version.ts',
].forEach(requireFile);

[
  'demo:assets',
  'demo:check',
  'demo:release-check',
  'demo:freeze-check',
  'pwa:assets',
  'pwa:check',
  'demo:imports',
  'import-flow:check',
  'maintenance-flow:check',
  'auth-flow:check',
  'knowledge-flow:check',
  'demo:knowledge',
  'file-flow:check',
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
].forEach((pattern) => requireGitIgnore(gitignore, pattern));

if (!hasGithubActionsCi()) warnings.push('未检测到 GitHub Actions workflow。');
if (!versionConfig.includes("APP_VERSION = 'V2.3'")) blockers.push('版本配置未检测到 V2.3。');
if (!versionConfig.includes("APP_STAGE = '现场知识库演示版'")) blockers.push('版本阶段未检测到现场知识库演示版。');

console.log('V2.3 demo freeze check');
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

console.log('\nDemo freeze check passed.');
console.log('\nSuggested next steps:');
console.log('- 安卓平板真机验收 V2.3 现场知识库演示版');
console.log('- push 分支后创建 PR');
console.log('- CI 通过后人工验收，再决定是否合并 main 和打 v2.3-fixture-quality-knowledge tag');
