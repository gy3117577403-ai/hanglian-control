import { loadApiEnvironmentFiles } from '../database/env-loader';
import { buildPrismaSeedPreview } from '../migration/migration-dry-run';

loadApiEnvironmentFiles();

const preview = buildPrismaSeedPreview();

console.log(JSON.stringify(preview, null, 2));

if (preview.errors.length > 0) {
  process.exitCode = 1;
}
