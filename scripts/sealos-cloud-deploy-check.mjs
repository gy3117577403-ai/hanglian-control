import { existsSync, readFileSync, readdirSync } from 'node:fs';
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

function requireNoUtf8Bom(path) {
  requireFile(path);
  if (!existsSync(join(root, path))) return;
  const content = readFileSync(join(root, path));
  const hasBom = content.length >= 3 && content[0] === 0xef && content[1] === 0xbb && content[2] === 0xbf;
  if (hasBom) failures.push(`${path} must not start with a UTF-8 BOM; PostgreSQL rejects it in migration SQL.`);
}

function requireTreeNoUtf8Bom(path) {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) return;
  for (const entry of readdirSync(fullPath, { withFileTypes: true })) {
    const childPath = `${path}/${entry.name}`;
    if (entry.isDirectory()) {
      requireTreeNoUtf8Bom(childPath);
    } else {
      requireNoUtf8Bom(childPath);
    }
  }
}

console.log('Sealos cloud deploy preparation check');
console.log('This check is local only. It does not connect to Sealos or any database.');

[
  'Dockerfile.api',
  'Dockerfile.migrate',
  'Dockerfile.tablet',
  '.dockerignore',
  'apps/api/scripts/start-cloud.mjs',
  'scripts/run-prisma-migrate-deploy.mjs',
  'apps/tablet/docker/nginx.conf',
  'apps/tablet/docker/entrypoint.sh',
  'apps/tablet/public/runtime-config.js',
  'apps/api/prisma/migrations/migration_lock.toml',
  'apps/api/prisma/migrations/20260617000100_initial_schema/migration.sql',
].forEach(requireFile);

requireIncludes('Dockerfile.api', 'RUN apk add --no-cache poppler-utils', 'API Dockerfile must install poppler-utils for PDF previews.');
requireIncludes('Dockerfile.api', 'CMD ["node", "apps/api/scripts/start-cloud.mjs"]', 'API Dockerfile must start the cloud startup script.');
requireIncludes('Dockerfile.api', '/app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts', 'API Dockerfile must include prisma.config.ts for explicit migration deploy.');
requireIncludes('Dockerfile.api', 'STORAGE_ROOT=/data/hanglian', 'API Dockerfile must default local storage to the Sealos volume path.');
requireIncludes('Dockerfile.api', 'PDF_PREVIEW_DENSITY=144', 'API Dockerfile must keep PDF preview density configured.');
requireIncludes('Dockerfile.tablet', 'apps/tablet/docker/entrypoint.sh', 'Tablet Dockerfile must generate runtime config.');
requireIncludes('Dockerfile.tablet', 'RUNTIME_API_BASE_URL', 'Tablet Dockerfile must expose runtime API base configuration.');
requireIncludes('apps/api/scripts/start-cloud.mjs', 'RUN_PRISMA_MIGRATE_DEPLOY', 'Cloud startup must gate migrate deploy behind an env flag.');
requireIncludes('apps/api/scripts/start-cloud.mjs', 'ALLOW_DESTRUCTIVE_DB_ACTIONS', 'Cloud startup must keep destructive DB guard checked.');
requireIncludes('apps/api/scripts/start-cloud.mjs', 'MIGRATION_CONFIRMATION', 'Cloud startup migration path must require explicit confirmation.');
requireIncludes('apps/api/scripts/start-cloud.mjs', '--config=prisma.config.ts', 'Cloud startup migration path must use prisma.config.ts.');
requireIncludes('apps/api/src/database/database-safety.ts', "target === 'staging'", 'Database safety must require the staging DB target.');
requireIncludes('apps/api/src/database/database-safety.ts', 'RUN_PRISMA_MIGRATE_DEPLOY', 'Database safety must report the migrate deploy gate.');
requireIncludes('scripts/run-prisma-migrate-deploy.mjs', 'MIGRATION_CONFIRMATION', 'Migration runner must require an explicit confirmation value.');
requireIncludes('scripts/run-prisma-migrate-deploy.mjs', 'prisma migrate deploy --config=/app/apps/api/prisma.config.ts', 'Migration runner must document the Prisma config command.');
requireIncludes('scripts/run-prisma-migrate-deploy.mjs', "'prisma', 'migrate', 'deploy'", 'Migration runner must execute prisma migrate deploy.');
requireIncludes('scripts/run-prisma-migrate-deploy.mjs', '--config=${path.normalize(configPath)}', 'Migration runner must use prisma.config.ts.');
requireIncludes('apps/tablet/src/config/api-base.ts', 'readPublicRuntimeConfig().API_BASE_URL', 'Tablet API base URL must support runtime config.');
requireIncludes('apps/tablet/index.html', '/runtime-config.js', 'Tablet index must load runtime config before Vue app.');
requireIncludes('apps/api/.env.example', 'DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?', 'API env example must keep placeholder DATABASE_URL.');
requireIncludes('apps/api/.env.example', 'schema=hanglian_control', 'API env example must prefer isolated Sealos schema.');
requireIncludes('apps/api/.env.example', 'RUN_PRISMA_MIGRATE_DEPLOY=false', 'API env example must default cloud migration to false.');
requireIncludes('apps/api/.env.example', 'MIGRATION_CONFIRMATION=', 'API env example must document the migration confirmation gate.');
requireIncludes('apps/api/.env.example', 'JWT_ACCESS_SECRET=change-me-access-secret', 'API env example must document JWT access secret.');
requireIncludes('apps/api/.env.example', 'JWT_REFRESH_SECRET=change-me-refresh-secret', 'API env example must document JWT refresh secret.');
requireIncludes('apps/api/.env.example', 'ADMIN_USERNAME=admin', 'API env example must document admin seed username.');
requireIncludes('apps/api/.env.example', 'ADMIN_PASSWORD=change-me-admin-password', 'API env example must document admin seed password placeholder.');
requireIncludes('apps/api/.env.example', 'DATABASE_SSL_MODE=require', 'API env example must document database SSL mode.');
requireIncludes('apps/api/.env.example', 'STORAGE_ROOT=./storage', 'API env example must document local storage root.');
requireIncludes('apps/api/.env.example', 'PDFTOPPM_PATH=', 'API env example must document optional pdftoppm path.');
requireIncludes('apps/api/.env.example', 'PDF_PREVIEW_TIMEOUT_MS=120000', 'API env example must document PDF preview timeout.');
requireIncludes('apps/api/.env.example', 'S3_SECRET_ACCESS_KEY=', 'API env example must keep S3 secret as a blank placeholder.');
requireIncludes('apps/tablet/.env.example', 'API_BASE_URL=', 'Tablet env example must document runtime API_BASE_URL.');
requireTreeNoUtf8Bom('apps/api/prisma/migrations');

if (failures.length) {
  console.error('\nSealos cloud deploy preparation check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sealos cloud deploy preparation check passed.');
