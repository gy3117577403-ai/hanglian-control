import { loadApiEnvironmentFiles } from '../database/env-loader';
import { validateMigrationData } from '../migration/migration-dry-run';

loadApiEnvironmentFiles();

const result = validateMigrationData();

console.log(JSON.stringify(result, null, 2));

if (!result.valid) {
  process.exitCode = 1;
}
