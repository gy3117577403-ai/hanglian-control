import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultCloudSchema = 'hanglian_control';
const startupRevision = 'schema-isolation-v3';

console.log(`Hanglian cloud startup revision: ${startupRevision}`);

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
    if (databaseName === '(missing)') {
      databaseUrl.pathname = '/postgres';
    }
    databaseUrl.searchParams.set('schema', defaultCloudSchema);
    process.env.DATABASE_URL = databaseUrl.toString();
    console.log(`Cloud database target normalized to isolated schema "${defaultCloudSchema}".`);
    return defaultCloudSchema;
  }
  console.log(`Cloud database target uses configured schema "${schemaName}".`);
  return schemaName;
}

async function ensureSchema(schemaName) {
  if (!schemaName || schemaName === 'public') return;

  const schemaSetupUrl = new URL(process.env.DATABASE_URL);
  schemaSetupUrl.searchParams.delete('schema');
  const client = new pg.Client({ connectionString: schemaSetupUrl.toString() });
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName.replaceAll('"', '""')}"`);
  } finally {
    await client.end();
  }
}

function run(command, args) {
  const executable = process.platform === 'win32' && command === 'npx' ? 'npx.cmd' : command;
  const result = spawnSync(executable, args, {
    cwd: apiDir,
    env: process.env,
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function assertCloudMigrationAllowed() {
  const checks = [
    ['DATA_SOURCE', process.env.DATA_SOURCE === 'prisma'],
    ['DEPLOYMENT_STAGE', process.env.DEPLOYMENT_STAGE === 'sealos-test'],
    ['DB_TARGET', process.env.DB_TARGET === 'test'],
    ['ALLOW_TEST_DB_CONNECT', isTrue(process.env.ALLOW_TEST_DB_CONNECT)],
    ['ALLOW_PRISMA_WRITE', isTrue(process.env.ALLOW_PRISMA_WRITE)],
    ['ALLOW_DESTRUCTIVE_DB_ACTIONS', !isTrue(process.env.ALLOW_DESTRUCTIVE_DB_ACTIONS)],
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
  const schemaName = assertCloudMigrationAllowed();
  await ensureSchema(schemaName);
  run('npx', ['prisma', 'migrate', 'deploy', '--schema=prisma/schema.prisma']);
}

run('node', ['dist/src/main.js']);
