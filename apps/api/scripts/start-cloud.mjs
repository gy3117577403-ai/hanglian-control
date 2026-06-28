import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultCloudSchema = process.env.CLOUD_DATABASE_SCHEMA || 'hanglian_control_ready';
const startupRevision = 'schema-isolation-v7';
const migrationConfirmation = 'APPLY_V318_MIGRATIONS_TO_STAGING';

console.log(`Hanglian cloud startup revision: ${startupRevision}`);

process.env.HOST ??= '0.0.0.0';
process.env.PORT ??= '3000';
process.env.API_PREFIX ??= 'api';
process.env.DATA_SOURCE ??= 'mock';
process.env.DEMO_DATA_MODE ??= 'empty';
process.env.FILE_STORAGE_PROVIDER ??= 'local';
process.env.STORAGE_ROOT ??= '/data/hanglian';
process.env.METADATA_ROOT ??= '/data/hanglian/metadata';
process.env.STORAGE_TEMP_ROOT ??= '/data/hanglian/tmp';
process.env.STORAGE_URL_MODE ??= 'proxy';
process.env.CORS_ALLOW_CREDENTIALS ??= 'false';
process.env.RUN_PRISMA_MIGRATE_DEPLOY ??= 'false';
process.env.ALLOW_TEST_DB_CONNECT ??= 'false';
process.env.ALLOW_PRISMA_WRITE ??= 'false';
process.env.ALLOW_DESTRUCTIVE_DB_ACTIONS ??= 'false';

console.log(`Cloud runtime mode: dataSource="${process.env.DATA_SOURCE}", storageProvider="${process.env.FILE_STORAGE_PROVIDER}".`);
console.log(`Cloud storage root configured: ${process.env.STORAGE_ROOT ? 'yes' : 'no'}.`);
console.log(`Prisma migrate deploy requested: ${isTrue(process.env.RUN_PRISMA_MIGRATE_DEPLOY) ? 'yes' : 'no'}.`);

function isTrue(value) {
  return String(value ?? '').toLowerCase() === 'true';
}

function readDatabaseTarget() {
  try {
    const databaseUrl = new URL(process.env.DATABASE_URL);
    const databaseName = databaseUrl.pathname.replace(/^\/+/, '') || '(missing)';
    const schemaName = databaseUrl.searchParams.get('schema') || 'public';
    return { databaseName, schemaName, databaseUrl };
  } catch {
    console.error('Refusing to run prisma migrate deploy. DATABASE_URL is not a valid PostgreSQL URL.');
    process.exit(1);
  }
}

function normalizeCloudDatabaseUrl() {
  const { databaseName, schemaName, databaseUrl } = readDatabaseTarget();
  console.log(`Cloud database target before normalization: database="${databaseName}", schema="${schemaName}".`);
  if ((databaseName === 'postgres' || databaseName === '(missing)') && schemaName === 'public') {
    applyDatabaseSchema(databaseUrl, databaseName, defaultCloudSchema);
    console.log(`Cloud database target normalized to isolated schema "${defaultCloudSchema}".`);
    return defaultCloudSchema;
  }
  applyDatabaseSchema(databaseUrl, databaseName, schemaName);
  console.log(`Cloud database target uses configured schema "${schemaName}".`);
  return schemaName;
}

function applyDatabaseSchema(databaseUrl, databaseName, schemaName) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schemaName)) {
    console.error(`Refusing to use invalid PostgreSQL schema name "${schemaName}".`);
    process.exit(1);
  }
  if (databaseName === '(missing)') {
    databaseUrl.pathname = '/postgres';
  }
  databaseUrl.searchParams.set('schema', schemaName);
  databaseUrl.searchParams.set('options', `-c search_path=${schemaName},public`);
  process.env.DATABASE_URL = databaseUrl.toString();
}

async function ensureSchema(schemaName) {
  if (!schemaName || schemaName === 'public') return;

  const schemaSetupUrl = new URL(process.env.DATABASE_URL);
  schemaSetupUrl.searchParams.delete('schema');
  schemaSetupUrl.searchParams.delete('options');
  const client = new pg.Client({ connectionString: schemaSetupUrl.toString() });
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName.replaceAll('"', '""')}"`);
  } finally {
    await client.end();
  }
}

function createDatabaseClient() {
  const schemaSetupUrl = new URL(process.env.DATABASE_URL);
  schemaSetupUrl.searchParams.delete('schema');
  schemaSetupUrl.searchParams.delete('options');
  return new pg.Client({ connectionString: schemaSetupUrl.toString() });
}

function escapeIdentifier(value) {
  return String(value).replaceAll('"', '""');
}

async function printMigrationDiagnostics(schemaName) {
  if (!schemaName || schemaName === 'public') return;

  const client = createDatabaseClient();
  await client.connect();
  try {
    const migrationsTable = `"${escapeIdentifier(schemaName)}"."_prisma_migrations"`;
    const tableCheck = await client.query('select to_regclass($1) as migration_table', [migrationsTable]);
    if (!tableCheck.rows[0]?.migration_table) {
      console.error(`No Prisma migrations table found in schema "${schemaName}".`);
      return;
    }

    const diagnostics = await client.query(
      `
        select migration_name, started_at, finished_at, rolled_back_at, logs
        from ${migrationsTable}
        where finished_at is null or logs is not null
        order by started_at desc
        limit 3
      `,
    );

    if (!diagnostics.rows.length) {
      console.error(`No failed Prisma migration details found in schema "${schemaName}".`);
      return;
    }

    console.error(`Prisma migration diagnostics for schema "${schemaName}":`);
    for (const row of diagnostics.rows) {
      console.error(`- migration: ${row.migration_name}`);
      console.error(`  started_at: ${row.started_at}`);
      console.error(`  finished_at: ${row.finished_at ?? '(not finished)'}`);
      console.error(`  rolled_back_at: ${row.rolled_back_at ?? '(not rolled back)'}`);
      if (row.logs) {
        console.error(`  logs: ${String(row.logs).slice(0, 4000)}`);
      }
    }
  } catch (error) {
    console.error(`Could not read Prisma migration diagnostics: ${error.message}`);
  } finally {
    await client.end();
  }
}

function run(command, args, options = {}) {
  const executable = process.platform === 'win32' && command === 'npx' ? 'npx.cmd' : command;
  const result = spawnSync(executable, args, {
    cwd: apiDir,
    env: process.env,
    stdio: 'inherit',
    shell: false,
  });
  if (!options.allowFailure && result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  return result.status ?? 1;
}

function assertCloudMigrationAllowed() {
  const checks = [
    ['DATA_SOURCE', process.env.DATA_SOURCE === 'postgres'],
    ['DB_TARGET', process.env.DB_TARGET === 'staging'],
    ['ALLOW_TEST_DB_CONNECT', isTrue(process.env.ALLOW_TEST_DB_CONNECT)],
    ['ALLOW_PRISMA_WRITE', isTrue(process.env.ALLOW_PRISMA_WRITE)],
    ['ALLOW_DESTRUCTIVE_DB_ACTIONS', !isTrue(process.env.ALLOW_DESTRUCTIVE_DB_ACTIONS)],
    ['MIGRATION_CONFIRMATION', process.env.MIGRATION_CONFIRMATION === migrationConfirmation],
  ];

  const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length) {
    console.error(`Refusing to run prisma migrate deploy. Invalid cloud DB safety flags: ${failed.join(', ')}`);
    process.exit(1);
  }
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('USER:PASSWORD@HOST')) {
    console.error('Refusing to run prisma migrate deploy. DATABASE_URL is missing or still an example value.');
    process.exit(1);
  }

  return normalizeCloudDatabaseUrl();
}

if (isTrue(process.env.RUN_PRISMA_MIGRATE_DEPLOY)) {
  if (process.env.DATA_SOURCE !== 'postgres') {
    console.error('Refusing to run prisma migrate deploy while DATA_SOURCE is not postgres.');
    process.exit(1);
  }
  const schemaName = assertCloudMigrationAllowed();
  await ensureSchema(schemaName);
  const status = run('npx', ['prisma', 'migrate', 'deploy', '--config=prisma.config.ts'], { allowFailure: true });
  if (status !== 0) {
    await printMigrationDiagnostics(schemaName);
    process.exit(status);
  }
}

run('node', ['dist/src/main.js']);
