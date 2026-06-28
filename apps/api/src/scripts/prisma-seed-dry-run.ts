import { loadApiEnvironmentFiles } from '../database/env-loader';
import { writeSeedPreviewFile } from '../migration/migration-dry-run';

loadApiEnvironmentFiles();

const result = writeSeedPreviewFile();

console.log(JSON.stringify({
  message: 'Prisma seed dry-run 预览已生成，未连接数据库，未写入数据库。',
  file: 'apps/api/storage/metadata/prisma-seed-preview.json',
  summary: {
    customers: result.preview.summary.customers,
    products: result.preview.summary.products,
    productionPlans: result.preview.summary.productionPlans,
    documents: result.preview.summary.documents,
    imports: result.preview.summary.imports,
    maintenanceRecords: result.preview.summary.maintenanceRecords,
    knowledge: result.preview.summary.knowledge,
    execution: result.preview.summary.execution,
    analytics: result.preview.summary.analytics,
    auditLogs: result.preview.summary.auditLogs,
  },
  environment: result.preview.environment,
  errors: result.preview.errors,
  warnings: result.preview.warnings,
}, null, 2));

if (result.preview.errors.length > 0) {
  process.exitCode = 1;
}
