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
  'apps/api/src/knowledge/knowledge.controller.ts',
  'apps/api/src/knowledge/knowledge.service.ts',
  'apps/api/src/knowledge/knowledge.types.ts',
  'apps/api/src/knowledge/dto/knowledge-bulk-update.dto.ts',
  'apps/api/src/imports/parsers/knowledge-import.parser.ts',
  'apps/api/src/maintenance/maintenance.service.ts',
  'apps/api/src/production-plans/production-plans.service.ts',
  'apps/tablet/src/components/field/WarmQuickActions.vue',
  'apps/tablet/src/components/knowledge/WarmKnowledgePanel.vue',
  'apps/tablet/src/components/knowledge/WarmKnowledgeMaintenancePanel.vue',
  'apps/tablet/src/components/warm/WarmProcessBoard.vue',
  'apps/tablet/src/stores/knowledge-store.ts',
  'apps/tablet/src/services/api.ts',
  'apps/tablet/src/types/production.ts',
  'docs/v2.4-knowledge-field-validation.md',
  'docs/v2.5-production-execution-flow.md',
  'docs/knowledge-library-guide.md',
].forEach(requireFile);

[
  "Get('plan/:planId/validation')",
  "Get('product/:productId/validation')",
  "Get('plan/:planId/recommendations')",
  "Post('fixtures/bulk-update')",
  "Post('abnormal-cases/bulk-update')",
  "Post('quality-standards/bulk-update')",
].forEach((needle) => requireIncludes('apps/api/src/knowledge/knowledge.controller.ts', needle, `Missing Knowledge API route: ${needle}`));

[
  'planValidation',
  'productValidation',
  'planRecommendations',
  'bulkUpdateFixtures',
  'bulkUpdateAbnormalCases',
  'bulkUpdateQualityStandards',
  'reviewItems',
  'fixture_available',
  'quality_effective',
  'expired_quality',
].forEach((needle) => requireIncludes('apps/api/src/knowledge/knowledge.service.ts', needle, `KnowledgeService missing V2.4 capability: ${needle}`));

[
  'field_knowledge_validation',
  'field_fixture_ready',
  'field_quality_ready',
].forEach((needle) => requireIncludes('apps/api/src/production-plans/production-plans.service.ts', needle, `Production readiness is not linked to knowledge validation: ${needle}`));

[
  'getPlanKnowledgeValidation',
  'getProductKnowledgeValidation',
  'getPlanKnowledgeRecommendations',
  'bulkUpdateFixtures',
  'bulkUpdateAbnormalCases',
  'bulkUpdateQualityStandards',
].forEach((needle) => requireIncludes('apps/tablet/src/services/api.ts', needle, `Tablet API missing method: ${needle}`));

[
  'planKnowledgeValidation',
  'productKnowledgeValidation',
  'recommendations',
  'bulkLoading',
  'selectedKnowledgeRows',
  'loadPlanValidation',
  'loadProductValidation',
  'loadRecommendations',
].forEach((needle) => requireIncludes('apps/tablet/src/stores/knowledge-store.ts', needle, `knowledge-store missing: ${needle}`));

[
  'validation',
  'fixtures',
  'abnormal',
  'quality',
  'recommendations',
].forEach((needle) => requireIncludes('apps/tablet/src/components/knowledge/WarmKnowledgePanel.vue', needle, `Knowledge panel missing V2.4 tab/content: ${needle}`));

[
  'window.confirm',
  'knowledge.bulkUpdateFixtures',
  'knowledge.bulkUpdateAbnormalCases',
  'knowledge.bulkUpdateQualityStandards',
].forEach((needle) => requireIncludes('apps/tablet/src/components/knowledge/WarmKnowledgeMaintenancePanel.vue', needle, `Batch maintenance missing: ${needle}`));

requireAnyIncludes(
  'apps/tablet/src/config/app-version.ts',
  ["APP_VERSION = 'V2.7'", "APP_VERSION = 'V3.1'"],
  'Version config is not an accepted V2.7+ release version.',
);
requireAnyIncludes(
  'apps/tablet/src/config/app-version.ts',
  ["APP_STAGE = '全流程回归候选版'", "APP_STAGE = '现场试运行配置版'"],
  'Version stage is not an accepted regression or field pilot stage.',
);
requireAnyIncludes(
  'apps/tablet/src/config/app-version.ts',
  [
    "APP_RELEASE_NAME = '线束车间平板管控系统全流程回归候选版'",
    "APP_RELEASE_NAME = '线束车间现场试运行配置版'",
  ],
  'Release name is not an accepted regression or field pilot release.',
);
requireAnyIncludes(
  'apps/tablet/src/config/app-version.ts',
  ['mock-local-full-regression-candidate', 'mock-local-field-pilot-config'],
  'Build channel is not an accepted regression or field pilot channel.',
);

requireIncludes('docs/api.md', '/api/knowledge/plan/:planId/validation', 'API docs missing knowledge validation API.');
requireIncludes('docs/api.md', '/api/knowledge/fixtures/bulk-update', 'API docs missing bulk update API.');
requireIncludes('package.json', '"knowledge-validation:check"', 'package.json missing knowledge-validation:check.');

console.log('V2.7 knowledge validation check');
console.log('This check is read-only. It does not connect to a database, run migrations, db push, seed, or delete files.');

if (blockers.length) {
  console.log('\nBlockers:');
  for (const blocker of blockers) console.log(`- ${blocker}`);
  process.exit(1);
}

console.log('\nKnowledge validation check passed.');
