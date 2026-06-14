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
  if (!exists(relativePath)) blockers.push(`Missing file: ${relativePath}`);
}

function requireIncludes(relativePath, text, message) {
  if (!read(relativePath).includes(text)) blockers.push(message);
}

[
  'apps/api/src/maintenance/maintenance.module.ts',
  'apps/api/src/maintenance/maintenance.controller.ts',
  'apps/api/src/maintenance/maintenance.service.ts',
  'apps/api/src/maintenance/dto/update-customer.dto.ts',
  'apps/api/src/maintenance/dto/update-product.dto.ts',
  'apps/api/src/maintenance/dto/update-production-plan.dto.ts',
  'apps/api/src/maintenance/dto/update-front-parameter.dto.ts',
  'apps/api/src/maintenance/dto/update-back-package.dto.ts',
  'apps/api/src/maintenance/dto/update-document-maintenance.dto.ts',
  'apps/api/src/maintenance/dto/bulk-status-update.dto.ts',
  'apps/api/src/maintenance/dto/review-record.dto.ts',
  'apps/api/src/maintenance/helpers/maintenance-normalizer.ts',
  'apps/api/src/maintenance/helpers/maintenance-validator.ts',
  'apps/tablet/src/components/maintenance/WarmMaintenanceCenterDialog.vue',
  'apps/tablet/src/stores/maintenance-store.ts',
  'docs/v2.1-maintenance-center.md',
  'docs/maintenance-guide.md',
].forEach(requireFile);

[
  'apps/api/storage/metadata/maintenance-records.json',
].forEach((pattern) => requireIncludes('.gitignore', pattern, `.gitignore does not ignore: ${pattern}`));

[
  "Controller('maintenance')",
  "Get('summary')",
  "Patch('customers/:id')",
  "Patch('products/:id')",
  "Patch('production-plans/:id')",
  "Patch('front-parameters/:id')",
  "Patch('back-packages/:id')",
  "Patch('documents/:id')",
  "Post('documents/:id/set-effective')",
  "Post('bulk-status')",
  "Get('review-queue')",
  "Post('review-queue/:id/resolve')",
  "Get('history')",
].forEach((needle) => requireIncludes('apps/api/src/maintenance/maintenance.controller.ts', needle, `Maintenance API route not found: ${needle}`));

[
  'getMaintenanceSummary',
  'getMaintenanceCustomers',
  'updateMaintenanceCustomer',
  'getMaintenanceReviewQueue',
  'resolveMaintenanceReviewItem',
  'getMaintenanceHistory',
].forEach((needle) => requireIncludes('apps/tablet/src/services/api.ts', needle, `Tablet API method not found: ${needle}`));

[
  'APP_VERSION = \'V2.2\'',
  'APP_STAGE = \'角色权限演示版\'',
  'APP_RELEASE_NAME = \'线束车间多角色权限演示版\'',
  'APP_BUILD_CHANNEL = \'mock-local-rbac-demo\'',
].forEach((needle) => requireIncludes('apps/tablet/src/config/app-version.ts', needle, `Version config not found: ${needle}`));

requireIncludes('apps/tablet/src/components/warm/WarmStatusBar.vue', '资料维护中心', 'Demo tools menu does not include 资料维护中心.');
requireIncludes('apps/tablet/src/views/TabletDashboard.vue', 'WarmMaintenanceCenterDialog', 'Tablet dashboard does not mount WarmMaintenanceCenterDialog.');
requireIncludes('apps/api/src/storage/local-storage.service.ts', 'maintenanceRecordsFile', 'Local storage service does not manage maintenance-records.json.');
requireIncludes('package.json', '"maintenance-flow:check"', 'Missing npm run maintenance-flow:check.');

if (!exists('apps/api/storage/metadata/imported-business-data.json')) {
  warnings.push('Imported metadata snapshot does not exist yet. Run demo import flow when demo data needs to be refreshed.');
}

console.log('V2.2 maintenance flow check');
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

console.log('\nMaintenance flow check passed.');
