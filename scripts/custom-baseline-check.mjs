import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];

const demoDirectories = [
  'demo-upload-assets',
  'demo-import-files',
  'demo-knowledge-files',
];

const metadataFiles = [
  'documents.json',
  'audit-logs.json',
  'import-records.json',
  'imported-business-data.json',
  'import-previews.json',
  'maintenance-records.json',
  'knowledge-fixtures.json',
  'knowledge-abnormal-cases.json',
  'knowledge-quality-standards.json',
  'knowledge-records.json',
  'execution-records.json',
  'plan-status-events.json',
  'quantity-reports.json',
  'shift-handover-records.json',
  'demo-analytics-snapshot.json',
  'prisma-seed-preview.json',
  'prisma-migration-preview.sql',
  'system-settings.json',
  'dictionary-settings.json',
  'station-profiles.json',
  'display-settings.json',
  'announcement-records.json',
  'system-feedback-records.json',
  'pilot-check-records.json',
  'settings-records.json',
];

function file(relativePath) {
  return join(root, relativePath);
}

function read(relativePath) {
  return existsSync(file(relativePath)) ? readFileSync(file(relativePath), 'utf8') : '';
}

function requireFile(relativePath, message = `缺少文件：${relativePath}`) {
  if (!existsSync(file(relativePath))) errors.push(message);
}

function requireIncludes(relativePath, text, message) {
  if (!read(relativePath).includes(text)) errors.push(message);
}

function entries(relativePath) {
  return existsSync(file(relativePath)) ? readdirSync(file(relativePath)) : [];
}

function checkEmptyOrMissingDirectory(relativePath) {
  const rows = entries(relativePath);
  if (rows.length) errors.push(`${relativePath} 应不存在或为空，当前仍有 ${rows.length} 项。`);
}

function checkOnlyGitkeep(relativePath) {
  const rows = entries(relativePath).filter((name) => name !== '.gitkeep');
  if (rows.length) errors.push(`${relativePath} 应只保留 .gitkeep，当前仍有：${rows.join('，')}`);
}

const gitignore = read('.gitignore');
const apiEnvExample = read('apps/api/.env.example');
const apiLocalEnvExample = read('apps/api/.env.local.example');
if (!apiEnvExample.includes('DEMO_DATA_MODE=empty')) errors.push('apps/api/.env.example 未声明 DEMO_DATA_MODE=empty。');
if (!apiLocalEnvExample.includes('DEMO_DATA_MODE=empty')) errors.push('apps/api/.env.local.example 未声明 DEMO_DATA_MODE=empty。');

for (const dir of demoDirectories) checkEmptyOrMissingDirectory(dir);
checkOnlyGitkeep('apps/api/storage/uploads');

for (const name of metadataFiles) {
  const relativePath = `apps/api/storage/metadata/${name}`;
  if (!existsSync(file(relativePath))) continue;
  if (gitignore.includes(relativePath)) {
    warnings.push(`metadata 运行数据仅存在于本机且已被忽略：${relativePath}`);
  } else {
    errors.push(`metadata 运行数据存在且未确认忽略：${relativePath}`);
  }
}

[
  'apps/api/.env.local',
  'apps/api/storage/uploads/*',
  'apps/api/storage/metadata/documents.json',
  'apps/api/storage/metadata/demo-analytics-snapshot.json',
  'apps/api/storage/metadata/settings-records.json',
  'local-backups/',
].forEach((pattern) => {
  if (!gitignore.includes(pattern)) errors.push(`.gitignore 缺少：${pattern}`);
});

[
  'scripts/clean-demo-data.mjs',
  'apps/tablet/src/components/common/WarmEmptyState.vue',
  'apps/api/src/config/mock-data-mode.ts',
  'apps/tablet/src/config/demo-data-mode.ts',
].forEach((path) => requireFile(path));

requireIncludes('package.json', '"demo:clean:dry"', 'package.json 缺少 demo:clean:dry。');
requireIncludes('package.json', '"demo:clean"', 'package.json 缺少 demo:clean。');
requireIncludes('package.json', '"custom-baseline:check"', 'package.json 缺少 custom-baseline:check。');

if (!read('apps/api/src/config/mock-data-mode.ts').includes("'empty'")) {
  errors.push('后端 Mock 数据模式未包含 empty。');
}

if (!read('apps/tablet/src/stores/production-store.ts').includes('暂无生产计划')) {
  warnings.push('前端生产计划空状态文案未检测到“暂无生产计划”。');
}

console.log('V3.1 定制开发基线检查');
console.log('该检查只读，不连接数据库，不执行 migrate / db push / seed，不写库。');

if (warnings.length) {
  console.log('\n提醒项：');
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (errors.length) {
  console.log('\n阻塞项：');
  for (const error of errors) console.log(`- ${error}`);
  process.exit(1);
}

console.log('\n定制开发基线检查通过。');
