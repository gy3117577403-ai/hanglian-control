import { existsSync, readFileSync } from 'node:fs';
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

[
  'apps/api/src/imports/imports.module.ts',
  'apps/api/src/imports/imports.controller.ts',
  'apps/api/src/imports/imports.service.ts',
  'apps/api/src/imports/parsers/production-plan-import.parser.ts',
  'apps/api/src/imports/parsers/customer-product-import.parser.ts',
  'apps/api/src/imports/parsers/front-parameter-import.parser.ts',
  'apps/api/src/imports/parsers/back-package-import.parser.ts',
  'apps/tablet/src/components/imports/WarmImportCenterDialog.vue',
  'apps/tablet/src/stores/import-store.ts',
  'docs/v2.0-data-import-center.md',
  'docs/import-template-guide.md',
].forEach(requireFile);

[
  'apps/api/storage/metadata/import-records.json',
  'apps/api/storage/metadata/imported-business-data.json',
  'apps/api/storage/metadata/import-previews.json',
].forEach((pattern) => requireIncludes('.gitignore', pattern, `.gitignore 未覆盖：${pattern}`));

requireIncludes('package.json', '"demo:imports"', '缺少 npm run demo:imports。');
requireIncludes('package.json', '"import-flow:check"', '缺少 npm run import-flow:check。');
requireIncludes('apps/api/src/imports/imports.controller.ts', "Controller('imports')", '未检测到 imports API 控制器。');
requireIncludes('apps/tablet/src/components/warm/WarmStatusBar.vue', '数据导入中心', '演示工具菜单未检测到数据导入中心入口。');

if (!exists('demo-import-files')) {
  warnings.push('未检测到 demo-import-files，请执行 npm run demo:imports 生成演示导入文件。');
}

console.log('V2.0 import flow check');
console.log('This check is read-only. It does not connect to a database, run migrations, db push, seed, or delete files.');

if (warnings.length) {
  console.log('\nWarnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (blockers.length) {
  console.log('\nBlockers:');
  for (const blocker of blockers) console.log(`- ${blocker}`);
  process.exit(1);
}

console.log('\nImport flow check passed.');
