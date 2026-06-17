import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function isTrue(value) {
  return String(value ?? '').toLowerCase() === 'true';
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
}

if (isTrue(process.env.RUN_PRISMA_MIGRATE_DEPLOY)) {
  assertCloudMigrationAllowed();
  run('npx', ['prisma', 'migrate', 'deploy', '--schema=prisma/schema.prisma']);
}

run('node', ['dist/src/main.js']);
