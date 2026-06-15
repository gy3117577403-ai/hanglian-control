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
  'apps/api/src/analytics/analytics.module.ts',
  'apps/api/src/analytics/analytics.controller.ts',
  'apps/api/src/analytics/analytics.service.ts',
  'apps/api/src/analytics/dto/analytics-query.dto.ts',
  'apps/api/src/analytics/dto/trend-query.dto.ts',
  'apps/api/src/analytics/dto/dashboard-filter.dto.ts',
  'apps/api/src/analytics/helpers/analytics-aggregator.ts',
  'apps/api/src/analytics/helpers/analytics-normalizer.ts',
  'apps/api/src/analytics/helpers/analytics-summary-text.ts',
  'apps/api/src/analytics/mock/analytics-seed.ts',
  'apps/tablet/src/components/analytics/WarmAnalyticsDashboardDialog.vue',
  'apps/tablet/src/stores/analytics-store.ts',
  'scripts/generate-demo-analytics-data.mjs',
  'docs/v2.6-dashboard-analytics.md',
  'docs/analytics-guide.md',
].forEach(requireFile);

[
  "Get('overview')",
  "Get('production')",
  "Get('quantity')",
  "Get('exceptions')",
  "Get('documents')",
  "Get('knowledge')",
  "Get('trends')",
  "Get('rankings')",
  "Get('summary-text')",
].forEach((needle) => requireIncludes('apps/api/src/analytics/analytics.controller.ts', needle, `Analytics API route missing: ${needle}`));

[
  'getAnalyticsOverview',
  'getAnalyticsProduction',
  'getAnalyticsQuantity',
  'getAnalyticsExceptions',
  'getAnalyticsDocuments',
  'getAnalyticsKnowledge',
  'getAnalyticsTrends',
  'getAnalyticsRankings',
  'getAnalyticsSummaryText',
].forEach((needle) => requireIncludes('apps/tablet/src/services/api.ts', needle, `Tablet analytics API missing: ${needle}`));

[
  'analytics.view',
  'analytics.production.view',
  'analytics.quality.view',
  'analytics.document.view',
  'analytics.knowledge.view',
  'analytics.summary.copy',
].forEach((needle) => {
  requireIncludes('apps/api/src/auth/mock-users.ts', needle, `Backend analytics permission missing: ${needle}`);
  requireIncludes('apps/tablet/src/lib/permissions.ts', needle, `Frontend analytics permission missing: ${needle}`);
});

requireIncludes('apps/tablet/src/components/analytics/WarmAnalyticsDashboardDialog.vue', 'vue-echarts', 'Analytics dashboard does not use vue-echarts.');
requireIncludes('apps/tablet/src/views/TabletDashboard.vue', 'WarmAnalyticsDashboardDialog', 'Tablet dashboard does not mount analytics dialog.');
requireIncludes('apps/tablet/src/components/warm/WarmStatusBar.vue', '现场统计', 'Status bar demo tools do not include 现场统计.');
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
requireIncludes('.gitignore', 'apps/api/storage/metadata/demo-analytics-snapshot.json', 'demo analytics snapshot is not ignored.');
requireIncludes('package.json', '"demo:analytics"', 'package.json missing demo:analytics.');
requireIncludes('package.json', '"analytics-flow:check"', 'package.json missing analytics-flow:check.');
requireIncludes('docs/api.md', '/api/analytics/overview', 'API docs missing analytics overview.');

console.log('V2.7 analytics flow check');
console.log('This check is read-only. It does not connect to a database, run migrations, db push, seed, or delete files.');

if (blockers.length) {
  console.log('\nBlockers:');
  for (const blocker of blockers) console.log(`- ${blocker}`);
  process.exit(1);
}

console.log('\nAnalytics flow check passed.');
