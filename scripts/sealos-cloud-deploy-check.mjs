import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];

function requireFile(path) {
  if (!existsSync(join(root, path))) failures.push(`Missing ${path}`);
}

function requireIncludes(path, needle, message) {
  requireFile(path);
  if (!existsSync(join(root, path))) return;
  const content = readFileSync(join(root, path), 'utf8');
  if (!content.includes(needle)) failures.push(message);
}

console.log('Sealos cloud deploy preparation check');
console.log('This check is local only. It does not connect to Sealos or any database.');

[
  'Dockerfile.api',
  'Dockerfile.tablet',
  '.dockerignore',
  'apps/api/scripts/start-cloud.mjs',
  'apps/tablet/nginx.conf',
  'apps/tablet/docker-runtime-config.sh',
  'apps/tablet/public/runtime-config.js',
  'apps/api/prisma/migrations/migration_lock.toml',
  'apps/api/prisma/migrations/20260617000100_initial_schema/migration.sql',
].forEach(requireFile);

requireIncludes('Dockerfile.api', 'start:cloud', 'API Dockerfile must start the cloud startup script.');
requireIncludes('Dockerfile.tablet', 'docker-runtime-config.sh', 'Tablet Dockerfile must generate runtime config.');
requireIncludes('apps/api/scripts/start-cloud.mjs', 'RUN_PRISMA_MIGRATE_DEPLOY', 'Cloud startup must gate migrate deploy behind an env flag.');
requireIncludes('apps/api/scripts/start-cloud.mjs', 'ALLOW_DESTRUCTIVE_DB_ACTIONS', 'Cloud startup must check destructive DB guard.');
requireIncludes('apps/api/src/database/database-safety.ts', 'DEPLOYMENT_STAGE', 'Database safety must include deployment stage guard.');
requireIncludes('apps/api/src/database/database-safety.ts', 'sealos-test', 'Database safety must require Sealos test deployment mode.');
requireIncludes('apps/tablet/src/config/api-base.ts', '__HANG_LIAN_CONFIG__', 'Tablet API base URL must support runtime config.');
requireIncludes('apps/tablet/index.html', '/runtime-config.js', 'Tablet index must load runtime config before Vue app.');
requireIncludes('apps/api/.env.example', 'DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public', 'API env example must keep placeholder DATABASE_URL.');
requireIncludes('apps/api/.env.example', 'RUN_PRISMA_MIGRATE_DEPLOY=false', 'API env example must default cloud migration to false.');
requireIncludes('apps/tablet/.env.example', 'API_BASE_URL=', 'Tablet env example must document runtime API_BASE_URL.');

if (failures.length) {
  console.error('\nSealos cloud deploy preparation check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sealos cloud deploy preparation check passed.');
