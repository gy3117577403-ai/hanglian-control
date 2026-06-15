import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const blockers = [];
const warnings = [];
const passed = [];

function toPosix(value) {
  return value.split('\\').join('/');
}

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return existsSync(join(root, relativePath));
}

function add(label, ok, detail, level = 'error') {
  const line = `${label}: ${detail}`;
  if (ok) {
    passed.push(line);
    return;
  }
  if (level === 'warning') warnings.push(line);
  else blockers.push(line);
}

function gitOk(args) {
  try {
    execFileSync('git', args, { cwd: root, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function parseEnv(content) {
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    result[match[1]] = match[2].replace(/^['"]|['"]$/g, '').trim();
  }
  return result;
}

function isExampleDatabaseUrl(value = '') {
  const lower = value.toLowerCase();
  return !value
    || value === 'postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public'
    || lower.includes('user:password@host')
    || lower.includes('example');
}

function looksProductionDatabase(value = '') {
  const lower = decodeURIComponent(value).toLowerCase();
  return ['prod', 'production', '生产', '正式'].some((keyword) => lower.includes(keyword));
}

const envExamplePath = 'apps/api/.env.local.example';
const envLocalPath = 'apps/api/.env.local';
const databaseSafetyPath = 'apps/api/src/database/database-safety.ts';
const readonlyScriptPath = 'apps/api/src/scripts/db-readonly-check.ts';
const migrationPreviewScriptPath = 'apps/api/src/scripts/prisma-migration-sql-preview.ts';
const seedDryRunScriptPath = 'apps/api/src/scripts/prisma-seed-dry-run.ts';

add('.env.local.example exists', exists(envExamplePath), `${envExamplePath} is present`);
add('.env.local exists', exists(envLocalPath), `${envLocalPath} is present`, 'warning');
add('.env.local ignored by Git', gitOk(['check-ignore', '-q', envLocalPath]), `${envLocalPath} is ignored`);
add('.env.local not tracked', !gitOk(['ls-files', '--error-unmatch', envLocalPath]), `${envLocalPath} is not tracked`);

if (exists(envLocalPath)) {
  const env = parseEnv(read(envLocalPath));
  const required = [
    'NODE_ENV',
    'PORT',
    'API_PREFIX',
    'DATA_SOURCE',
    'DB_TARGET',
    'DATABASE_URL',
    'ALLOW_TEST_DB_CONNECT',
    'ALLOW_PRISMA_WRITE',
    'ALLOW_DESTRUCTIVE_DB_ACTIONS',
    'SEED_MODE',
    'DATABASE_SSL_MODE',
    'DATABASE_CONNECT_TIMEOUT_SECONDS',
  ];

  for (const key of required) {
    add(`env ${key}`, Object.prototype.hasOwnProperty.call(env, key), 'required key is present');
  }

  add('DB_TARGET safety', env.DB_TARGET === 'test', 'DB_TARGET must be test for V3.0A');
  add('ALLOW_TEST_DB_CONNECT safety', env.ALLOW_TEST_DB_CONNECT === 'true', 'read-only test connection flag is true');
  add('ALLOW_PRISMA_WRITE safety', env.ALLOW_PRISMA_WRITE === 'false', 'write flag remains false');
  add('ALLOW_DESTRUCTIVE_DB_ACTIONS safety', env.ALLOW_DESTRUCTIVE_DB_ACTIONS === 'false', 'destructive flag remains false');
  add('DATABASE_URL production guard', !looksProductionDatabase(env.DATABASE_URL), 'database URL does not look like production');

  if (isExampleDatabaseUrl(env.DATABASE_URL)) {
    warnings.push('DATABASE_URL still uses the example value; db:readonly-check should exit before connecting.');
  } else {
    warnings.push('DATABASE_URL appears configured; scripts must continue masking it in all output.');
  }
}

const safetyText = exists(databaseSafetyPath) ? read(databaseSafetyPath) : '';
add('database safety stage', safetyText.includes('V3.0A_SEALOS_READONLY_CHECK'), 'V3.0A stage is declared');
add('database write guard', safetyText.includes('assertDatabaseWriteAllowed'), 'write guard exists');
add('destructive action guard', safetyText.includes('assertDestructiveDbActionAllowed'), 'destructive guard exists');
add('masked database URL', safetyText.includes('maskDatabaseUrl'), 'masking helper exists');

const readonlyScript = exists(readonlyScriptPath) ? read(readonlyScriptPath) : '';
add('readonly script uses guard', readonlyScript.includes('assertReadOnlyDatabaseCheckAllowed'), 'guard is required before SELECT checks');
add('readonly script uses SELECT only', /SELECT\s+1/i.test(readonlyScript), 'SELECT smoke check is present');
add(
  'readonly script has no write SQL',
  !/\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE)\b/i.test(readonlyScript),
  'no write or destructive SQL keywords detected',
);

const migrationPreviewScript = exists(migrationPreviewScriptPath) ? read(migrationPreviewScriptPath) : '';
add('migration SQL preview exists', Boolean(migrationPreviewScript), `${migrationPreviewScriptPath} is present`);
add('migration preview uses diff', migrationPreviewScript.includes('migrate') && migrationPreviewScript.includes('diff'), 'uses prisma migrate diff');
add(
  'migration preview avoids write commands',
  !/(migrate\s+dev|migrate\s+deploy|db\s+push|db\s+seed)/i.test(migrationPreviewScript),
  'no migrate dev/deploy, db push, or db seed command',
);

const seedDryRunScript = exists(seedDryRunScriptPath) ? read(seedDryRunScriptPath) : '';
add('seed dry-run exists', Boolean(seedDryRunScript), `${seedDryRunScriptPath} is present`);
add('seed dry-run file output', seedDryRunScript.includes('writeSeedPreviewFile'), 'writes local ignored preview only');

const rootPackage = JSON.parse(read('package.json'));
add('root sealos:readonly-check script', rootPackage.scripts?.['sealos:readonly-check'] === 'node scripts/sealos-readonly-check.mjs', 'root script exists');
add('root sealos:readonly-report script', rootPackage.scripts?.['sealos:readonly-report'] === 'node scripts/sealos-readonly-report.mjs', 'root script exists');

const apiPackage = JSON.parse(read('apps/api/package.json'));
add('api db:readonly-check script', Boolean(apiPackage.scripts?.['db:readonly-check']), 'api script exists');
add('api migration sql preview script', Boolean(apiPackage.scripts?.['prisma:migration:sql-preview']), 'api script exists');
add('api seed dry-run script', Boolean(apiPackage.scripts?.['prisma:seed:dry-run']), 'api script exists');

const forbiddenTracked = [
  '.env.local',
  'apps/api/.env.local',
  'apps/api/storage/metadata/documents.json',
  'apps/api/storage/metadata/audit-logs.json',
  'apps/api/storage/metadata/prisma-seed-preview.json',
  'apps/api/storage/metadata/prisma-migration-preview.sql',
  'apps/api/storage/metadata/sealos-readonly-report.json',
];

for (const path of forbiddenTracked) {
  add(`not tracked ${path}`, !gitOk(['ls-files', '--error-unmatch', toPosix(path)]), 'forbidden local artifact is not tracked');
}

console.log('V3.0A Sealos readonly preparation check');
console.log('This script does not connect to a database and does not run migrations, db push, seed, or writes.');
console.log(`Passed: ${passed.length}`);
console.log(`Warnings: ${warnings.length}`);
console.log(`Blockers: ${blockers.length}`);

if (warnings.length) {
  console.log('\nWarnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (blockers.length) {
  console.log('\nBlockers:');
  for (const blocker of blockers) console.log(`- ${blocker}`);
  process.exit(1);
}

console.log('\nV3.0A readonly preparation check passed.');
