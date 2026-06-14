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

[
  "APP_VERSION = 'V2.4'",
  "APP_STAGE = '现场知识验证演示版'",
  "APP_RELEASE_NAME = '线束车间现场知识验证演示版'",
  "APP_BUILD_CHANNEL = 'mock-local-knowledge-validation-demo'",
].forEach((needle) => requireIncludes('apps/tablet/src/config/app-version.ts', needle, `Version config missing: ${needle}`));

requireIncludes('docs/api.md', '/api/knowledge/plan/:planId/validation', 'API docs missing knowledge validation API.');
requireIncludes('docs/api.md', '/api/knowledge/fixtures/bulk-update', 'API docs missing bulk update API.');
requireIncludes('package.json', '"knowledge-validation:check"', 'package.json missing knowledge-validation:check.');

console.log('V2.4 knowledge validation check');
console.log('This check is read-only. It does not connect to a database, run migrations, db push, seed, or delete files.');

if (blockers.length) {
  console.log('\nBlockers:');
  for (const blocker of blockers) console.log(`- ${blocker}`);
  process.exit(1);
}

console.log('\nKnowledge validation check passed.');
