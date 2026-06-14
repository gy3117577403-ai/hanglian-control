import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const blockers = [];

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
  'apps/api/src/knowledge/knowledge.module.ts',
  'apps/api/src/knowledge/knowledge.controller.ts',
  'apps/api/src/knowledge/knowledge.service.ts',
  'apps/api/src/knowledge/mock/knowledge-seed.ts',
  'apps/api/src/knowledge/helpers/knowledge-normalizer.ts',
  'apps/api/src/knowledge/helpers/knowledge-validator.ts',
  'apps/api/src/knowledge/dto/fixture-query.dto.ts',
  'apps/api/src/knowledge/dto/update-fixture.dto.ts',
  'apps/api/src/knowledge/dto/abnormal-query.dto.ts',
  'apps/api/src/knowledge/dto/update-abnormal.dto.ts',
  'apps/api/src/knowledge/dto/quality-query.dto.ts',
  'apps/api/src/knowledge/dto/update-quality.dto.ts',
  'apps/api/src/knowledge/dto/knowledge-link-query.dto.ts',
  'apps/api/src/knowledge/dto/knowledge-search.dto.ts',
  'apps/tablet/src/stores/knowledge-store.ts',
  'apps/tablet/src/components/knowledge/WarmKnowledgePanel.vue',
  'apps/tablet/src/components/knowledge/WarmFixtureCard.vue',
  'apps/tablet/src/components/knowledge/WarmAbnormalCaseCard.vue',
  'apps/tablet/src/components/knowledge/WarmQualityStandardCard.vue',
  'apps/tablet/src/components/knowledge/WarmKnowledgeDetailDialog.vue',
  'scripts/generate-demo-knowledge-files.mjs',
  'docs/v2.3-fixture-quality-knowledge.md',
  'docs/knowledge-library-guide.md',
].forEach(requireFile);

[
  'apps/api/storage/metadata/knowledge-fixtures.json',
  'apps/api/storage/metadata/knowledge-abnormal-cases.json',
  'apps/api/storage/metadata/knowledge-quality-standards.json',
  'apps/api/storage/metadata/knowledge-records.json',
].forEach((pattern) => requireIncludes('.gitignore', pattern, `.gitignore 未覆盖：${pattern}`));

[
  "Controller('knowledge')",
  "Get('fixtures')",
  "Post('fixtures')",
  "Patch('fixtures/:id')",
  "Patch('fixtures/:id/status')",
  "Get('abnormal-cases')",
  "Post('abnormal-cases')",
  "Patch('abnormal-cases/:id')",
  "Patch('abnormal-cases/:id/status')",
  "Get('quality-standards')",
  "Post('quality-standards')",
  "Patch('quality-standards/:id')",
  "Patch('quality-standards/:id/status')",
  "Get('product/:productId/summary')",
  "Get('plan/:planId/summary')",
  "Get('search')",
  "Get('history')",
].forEach((needle) => requireIncludes('apps/api/src/knowledge/knowledge.controller.ts', needle, `Knowledge API route not found: ${needle}`));

[
  'knowledge.fixture.view',
  'knowledge.fixture.create',
  'knowledge.fixture.update',
  'knowledge.abnormal.view',
  'knowledge.abnormal.create',
  'knowledge.abnormal.update',
  'knowledge.quality.view',
  'knowledge.quality.create',
  'knowledge.quality.update',
  'knowledge.history.view',
].forEach((needle) => {
  requireIncludes('apps/api/src/auth/mock-users.ts', needle, `后端权限缺失：${needle}`);
  requireIncludes('apps/tablet/src/lib/permissions.ts', needle, `前端权限缺失：${needle}`);
});

[
  'getFixtures',
  'createFixture',
  'updateFixtureStatus',
  'getAbnormalCases',
  'updateAbnormalStatus',
  'getQualityStandards',
  'updateQualityStatus',
  'getPlanKnowledgeSummary',
  'searchKnowledge',
  'getKnowledgeHistory',
].forEach((needle) => requireIncludes('apps/tablet/src/services/api.ts', needle, `Tablet API method not found: ${needle}`));

[
  'fixture',
  'abnormal_case',
  'quality_standard',
].forEach((needle) => {
  requireIncludes('apps/api/src/imports/import-template-definitions.ts', needle, `导入模板缺失：${needle}`);
  requireIncludes('apps/tablet/src/stores/import-store.ts', needle, `前端导入类型缺失：${needle}`);
  requireIncludes('apps/api/src/knowledge/knowledge.types.ts', needle, `知识库类型缺失：${needle}`);
});

requireIncludes('apps/api/src/search/search.service.ts', 'KnowledgeService', '全局搜索未注入 KnowledgeService');
requireIncludes('apps/api/src/search/search.service.ts', 'knowledgeService.search', '全局搜索未调用知识库搜索');

[
  'model Fixture',
  'model AbnormalCase',
  'model QualityStandard',
  'model KnowledgeRecord',
].forEach((needle) => requireIncludes('apps/api/prisma/schema.prisma', needle, `Prisma schema 缺失：${needle}`));

requireIncludes('package.json', '"knowledge-flow:check"', '缺少 npm run knowledge-flow:check');
requireIncludes('package.json', '"demo:knowledge"', '缺少 npm run demo:knowledge');
requireIncludes('apps/tablet/src/config/app-version.ts', "APP_VERSION = 'V2.3'", '版本常量不是 V2.3');
requireIncludes('apps/tablet/src/config/app-version.ts', "APP_BUILD_CHANNEL = 'mock-local-knowledge-demo'", '构建通道不是 mock-local-knowledge-demo');

console.log('V2.3 knowledge flow check');
console.log('This check is read-only. It does not connect to a database, run migrations, db push, seed, or delete files.');

if (blockers.length) {
  console.log('\nBlockers:');
  for (const blocker of blockers) console.log(`- ${blocker}`);
  process.exit(1);
}

console.log('\nKnowledge flow check passed.');
