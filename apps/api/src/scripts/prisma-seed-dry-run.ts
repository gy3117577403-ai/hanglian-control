import { loadApiEnvironmentFiles } from '../database/env-loader';
import { writeSeedPreviewFile } from '../migration/migration-dry-run';

loadApiEnvironmentFiles();

const result = writeSeedPreviewFile();

console.log(JSON.stringify({
  message: 'Prisma seed dry-run 预览已生成，未连接数据库，未写入数据库。',
  file: result.file,
  summary: result.preview.summary,
  environment: result.preview.environment,
  errors: result.preview.errors,
  warnings: result.preview.warnings,
}, null, 2));

if (result.preview.errors.length > 0) {
  process.exitCode = 1;
}
