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
  'apps/api/src/auth/auth.controller.ts',
  'apps/api/src/auth/auth.module.ts',
  'apps/api/src/auth/auth.service.ts',
  'apps/api/src/auth/decorators/current-user.decorator.ts',
  'apps/api/src/auth/decorators/require-permissions.decorator.ts',
  'apps/api/src/auth/guards/mock-permission.guard.ts',
  'apps/api/src/auth/mock-users.ts',
  'apps/tablet/src/app/routes.ts',
  'apps/tablet/src/stores/auth-store.ts',
  'apps/tablet/src/lib/permissions.ts',
  'apps/tablet/src/views/WarmLoginView.vue',
  'apps/tablet/src/components/auth/WarmPermissionDenied.vue',
  'docs/v2.2-role-permission.md',
  'docs/permission-matrix.md',
  'docs/v2.5-production-execution-flow.md',
].forEach(requireFile);

[
  "Controller('auth')",
  "Get('mock-users')",
  "Post('mock-login')",
  "Get('me')",
].forEach((needle) => {
  requireIncludes('apps/api/src/auth/auth.controller.ts', needle, `Auth API route not found: ${needle}`);
});

[
  'front_leader',
  'back_leader',
  'maintainer',
  'process_engineer',
  'quality',
  'admin',
  'knowledge.fixture.view',
  'knowledge.fixture.update',
  'knowledge.abnormal.view',
  'knowledge.abnormal.update',
  'knowledge.quality.view',
  'knowledge.quality.update',
  'execution.view',
  'execution.start',
  'execution.quantity_report',
  'execution.daily_report.view',
  'analytics.view',
  'analytics.production.view',
  'analytics.document.view',
  'analytics.summary.copy',
].forEach((needle) => {
  requireIncludes('apps/api/src/auth/mock-users.ts', needle, `Backend mock role or permission not found: ${needle}`);
  requireIncludes('apps/tablet/src/lib/permissions.ts', needle, `Frontend permission not found: ${needle}`);
});

[
  'useAuthStore',
  'mockLogin',
  'loadMe',
  'logout',
  'hasPermission',
].forEach((needle) => {
  requireIncludes('apps/tablet/src/stores/auth-store.ts', needle, `Auth store method not found: ${needle}`);
});

[
  'beforeEach',
  '/login',
  'loadMe',
].forEach((needle) => {
  requireIncludes('apps/tablet/src/app/routes.ts', needle, `Router auth guard not found: ${needle}`);
});

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
].forEach((pattern) => {
  requireIncludes('.gitignore', pattern, `.gitignore does not ignore: ${pattern}`);
});

requireIncludes('package.json', '"auth-flow:check"', 'Missing npm run auth-flow:check.');
requireAnyIncludes(
  'apps/tablet/src/config/app-version.ts',
  ["APP_VERSION = 'V2.7'", "APP_VERSION = 'V3.1'"],
  'Version config is not an accepted V2.7+ release version.',
);
requireAnyIncludes(
  'apps/tablet/src/config/app-version.ts',
  ['mock-local-full-regression-candidate', 'mock-local-field-pilot-config', 'mock-local-custom-baseline'],
  'Build channel is not an accepted regression, field pilot, or custom baseline channel.',
);

console.log('V2.7 auth flow check');
console.log('This check is read-only. It does not connect to a database, run migrations, db push, seed, or delete files.');

if (blockers.length) {
  console.log('\nBlockers:');
  for (const blocker of blockers) console.log(`- ${blocker}`);
  process.exit(1);
}

console.log('\nAuth flow check passed.');
