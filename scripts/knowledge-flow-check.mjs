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
  if (!exists(relativePath)) blockers.push(`Missing file: ${relativePath}`);
}

function requireIncludes(relativePath, text, message) {
  if (!read(relativePath).includes(text)) blockers.push(message);
}

function requireAnyIncludes(relativePath, texts, message) {
  const content = read(relativePath);
  if (!texts.some((text) => content.includes(text))) blockers.push(message);
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
  'apps/api/src/knowledge/dto/knowledge-bulk-update.dto.ts',
  'apps/tablet/src/stores/knowledge-store.ts',
  'apps/tablet/src/components/knowledge/WarmKnowledgePanel.vue',
  'apps/tablet/src/components/knowledge/WarmKnowledgeMaintenancePanel.vue',
  'apps/tablet/src/components/knowledge/WarmFixtureCard.vue',
  'apps/tablet/src/components/knowledge/WarmAbnormalCaseCard.vue',
  'apps/tablet/src/components/knowledge/WarmQualityStandardCard.vue',
  'apps/tablet/src/components/knowledge/WarmKnowledgeDetailDialog.vue',
  'scripts/generate-demo-knowledge-files.mjs',
  'docs/v2.3-fixture-quality-knowledge.md',
  'docs/v2.4-knowledge-field-validation.md',
  'docs/v2.5-production-execution-flow.md',
  'docs/knowledge-library-guide.md',
].forEach(requireFile);

[
  'apps/api/storage/metadata/knowledge-fixtures.json',
  'apps/api/storage/metadata/knowledge-abnormal-cases.json',
  'apps/api/storage/metadata/knowledge-quality-standards.json',
  'apps/api/storage/metadata/knowledge-records.json',
].forEach((pattern) => requireIncludes('.gitignore', pattern, `.gitignore does not ignore: ${pattern}`));

[
  "Controller('knowledge')",
  "Get('fixtures')",
  "Post('fixtures')",
  "Patch('fixtures/:id')",
  "Patch('fixtures/:id/status')",
  "Post('fixtures/bulk-update')",
  "Get('abnormal-cases')",
  "Post('abnormal-cases')",
  "Patch('abnormal-cases/:id')",
  "Patch('abnormal-cases/:id/status')",
  "Post('abnormal-cases/bulk-update')",
  "Get('quality-standards')",
  "Post('quality-standards')",
  "Patch('quality-standards/:id')",
  "Patch('quality-standards/:id/status')",
  "Post('quality-standards/bulk-update')",
  "Get('product/:productId/summary')",
  "Get('product/:productId/validation')",
  "Get('plan/:planId/summary')",
  "Get('plan/:planId/validation')",
  "Get('plan/:planId/recommendations')",
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
  requireIncludes('apps/api/src/auth/mock-users.ts', needle, `Backend permission not found: ${needle}`);
  requireIncludes('apps/tablet/src/lib/permissions.ts', needle, `Frontend permission not found: ${needle}`);
});

[
  'getFixtures',
  'createFixture',
  'updateFixtureStatus',
  'bulkUpdateFixtures',
  'getAbnormalCases',
  'updateAbnormalStatus',
  'bulkUpdateAbnormalCases',
  'getQualityStandards',
  'updateQualityStatus',
  'bulkUpdateQualityStandards',
  'getPlanKnowledgeSummary',
  'getPlanKnowledgeValidation',
  'getPlanKnowledgeRecommendations',
  'searchKnowledge',
  'getKnowledgeHistory',
].forEach((needle) => requireIncludes('apps/tablet/src/services/api.ts', needle, `Tablet API method not found: ${needle}`));

[
  'fixture',
  'abnormal_case',
  'quality_standard',
].forEach((needle) => {
  requireIncludes('apps/api/src/imports/import-template-definitions.ts', needle, `Import template missing: ${needle}`);
  requireIncludes('apps/tablet/src/stores/import-store.ts', needle, `Frontend import type missing: ${needle}`);
  requireIncludes('apps/api/src/knowledge/knowledge.types.ts', needle, `Knowledge type missing: ${needle}`);
});

requireIncludes('apps/api/src/search/search.service.ts', 'KnowledgeService', 'Global search does not inject KnowledgeService.');
requireIncludes('apps/api/src/search/search.service.ts', 'knowledgeService.search', 'Global search does not query knowledge search.');

[
  'model Fixture',
  'model AbnormalCase',
  'model QualityStandard',
  'model KnowledgeRecord',
].forEach((needle) => requireIncludes('apps/api/prisma/schema.prisma', needle, `Prisma schema missing: ${needle}`));

requireIncludes('package.json', '"knowledge-flow:check"', 'Missing npm run knowledge-flow:check.');
requireIncludes('package.json', '"demo:knowledge"', 'Missing npm run demo:knowledge.');
requireAnyIncludes(
  'apps/tablet/src/config/app-version.ts',
  ["APP_VERSION = 'V2.7'", "APP_VERSION = 'V3.1'"],
  'Version config is not an accepted V2.7+ release version.',
);
requireAnyIncludes(
  'apps/tablet/src/config/app-version.ts',
  ['mock-local-full-regression-candidate', 'mock-local-field-pilot-config'],
  'Build channel is not an accepted regression or field pilot channel.',
);

console.log('V2.7 knowledge flow check');
console.log('This check is read-only. It does not connect to a database, run migrations, db push, seed, or delete files.');

if (blockers.length) {
  console.log('\nBlockers:');
  for (const blocker of blockers) console.log(`- ${blocker}`);
  process.exit(1);
}

console.log('\nKnowledge flow check passed.');
