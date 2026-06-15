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
  'apps/api/src/execution/execution.module.ts',
  'apps/api/src/execution/execution.controller.ts',
  'apps/api/src/execution/execution.service.ts',
  'apps/api/src/execution/execution.types.ts',
  'apps/api/src/execution/dto/start-plan.dto.ts',
  'apps/api/src/execution/dto/pause-plan.dto.ts',
  'apps/api/src/execution/dto/resume-plan.dto.ts',
  'apps/api/src/execution/dto/complete-plan.dto.ts',
  'apps/api/src/execution/dto/quantity-report.dto.ts',
  'apps/api/src/execution/dto/process-confirmation.dto.ts',
  'apps/api/src/execution/dto/shift-handover.dto.ts',
  'apps/api/src/execution/helpers/execution-validator.ts',
  'apps/api/src/execution/helpers/execution-normalizer.ts',
  'apps/api/src/execution/helpers/execution-timeline.ts',
  'apps/api/src/execution/mock/execution-seed.ts',
  'apps/tablet/src/stores/execution-store.ts',
  'apps/tablet/src/components/execution/WarmExecutionPanel.vue',
  'apps/tablet/src/components/execution/WarmExecutionStatusCard.vue',
  'apps/tablet/src/components/execution/WarmExecutionActions.vue',
  'apps/tablet/src/components/execution/WarmStartCheckDialog.vue',
  'apps/tablet/src/components/execution/WarmQuantityReportDialog.vue',
  'apps/tablet/src/components/execution/WarmProcessConfirmDialog.vue',
  'apps/tablet/src/components/execution/WarmShiftHandoverDialog.vue',
  'apps/tablet/src/components/execution/WarmExecutionTimeline.vue',
  'apps/tablet/src/components/execution/WarmDailyReportDialog.vue',
  'docs/v2.5-production-execution-flow.md',
  'docs/execution-flow-guide.md',
].forEach(requireFile);

[
  "Get('summary')",
  "Get('plans')",
  "Get('plans/:planId')",
  "Post('plans/:planId/prepare-start')",
  "Post('plans/:planId/start')",
  "Post('plans/:planId/process-confirm')",
  "Post('plans/:planId/quantity-report')",
  "Post('plans/:planId/pause')",
  "Post('plans/:planId/resume')",
  "Post('plans/:planId/exception-hold')",
  "Post('plans/:planId/complete')",
  "Get('plans/:planId/timeline')",
  "Post('shift-handover')",
  "Get('shift-handover')",
  "Get('daily-report')",
  "Get('daily-report/text')",
].forEach((needle) => requireIncludes('apps/api/src/execution/execution.controller.ts', needle, `Execution API route not found: ${needle}`));

[
  'getExecutionSummary',
  'getExecutionPlans',
  'getExecutionPlanDetail',
  'preparePlanStart',
  'startPlanExecution',
  'processConfirm',
  'reportQuantity',
  'pausePlan',
  'resumePlan',
  'exceptionHoldPlan',
  'completePlan',
  'getExecutionTimeline',
  'createShiftHandover',
  'getShiftHandover',
  'getDailyReport',
  'getDailyReportText',
].forEach((needle) => requireIncludes('apps/tablet/src/services/api.ts', needle, `Tablet execution API method missing: ${needle}`));

[
  'execution.view',
  'execution.start',
  'execution.pause',
  'execution.resume',
  'execution.exception_hold',
  'execution.complete',
  'execution.quantity_report',
  'execution.process_confirm',
  'execution.handover',
  'execution.daily_report.view',
].forEach((needle) => {
  requireIncludes('apps/api/src/auth/mock-users.ts', needle, `Backend execution permission missing: ${needle}`);
  requireIncludes('apps/tablet/src/lib/permissions.ts', needle, `Frontend execution permission missing: ${needle}`);
});

[
  'apps/api/storage/metadata/execution-records.json',
  'apps/api/storage/metadata/plan-status-events.json',
  'apps/api/storage/metadata/quantity-reports.json',
  'apps/api/storage/metadata/shift-handover-records.json',
].forEach((pattern) => requireIncludes('.gitignore', pattern, `.gitignore does not ignore: ${pattern}`));

[
  'model ExecutionRecord',
  'model PlanStatusEvent',
  'model QuantityReport',
  'model ShiftHandoverRecord',
  'enum ExecutionStatus',
  'enum ExecutionEventType',
  'enum ProcessConfirmType',
  'enum ProcessConfirmResult',
].forEach((needle) => requireIncludes('apps/api/prisma/schema.prisma', needle, `Prisma schema missing: ${needle}`));

requireIncludes('apps/tablet/src/views/TabletDashboard.vue', 'WarmExecutionPanel', 'Tablet dashboard does not mount WarmExecutionPanel.');
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
requireIncludes('README.md', '现场执行闭环', 'README missing V2.5 execution flow notes.');
requireIncludes('docs/api.md', '/api/execution/summary', 'API docs missing execution summary endpoint.');
requireIncludes('package.json', '"execution-flow:check"', 'package.json missing execution-flow:check.');

console.log('V2.7 execution flow check');
console.log('This check is read-only. It does not connect to a database, run migrations, db push, seed, or delete files.');

if (blockers.length) {
  console.log('\nBlockers:');
  for (const blocker of blockers) console.log(`- ${blocker}`);
  process.exit(1);
}

console.log('\nExecution flow check passed.');
