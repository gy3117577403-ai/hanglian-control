import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const blockers = [];

function read(relativePath) {
  const file = join(root, relativePath);
  if (!existsSync(file)) {
    blockers.push(`Missing file: ${relativePath}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function requireIncludes(relativePath, needle, message) {
  if (!read(relativePath).includes(needle)) blockers.push(message);
}

function requireNotIncludes(relativePath, needle, message) {
  if (read(relativePath).includes(needle)) blockers.push(message);
}

console.log('V3.10 cloud alignment check');
console.log('This check is local-only. It does not connect to Sealos, a database, S3, or any remote service.');

[
  'Dockerfile.api',
  'apps/api/scripts/start-cloud.mjs',
  'deploy/sealos/api-storage-env.example',
  'apps/api/.env.example',
  'apps/api/.env.local.example',
  'docs/sealos-cloud-deployment.md',
].forEach((file) => read(file));

requireIncludes('Dockerfile.api', 'STORAGE_ROOT=/data/hanglian', 'API Dockerfile must point local storage to the future Sealos volume mount.');
requireIncludes('Dockerfile.api', 'RUN_PRISMA_MIGRATE_DEPLOY=false', 'API Dockerfile must not run migrations by default.');
requireIncludes('Dockerfile.api', 'mkdir -p /data/hanglian/uploads', 'API Dockerfile must create upload/metadata/tmp directories.');
requireIncludes('apps/api/scripts/start-cloud.mjs', "process.env.STORAGE_ROOT ??= '/data/hanglian'", 'Cloud startup must default STORAGE_ROOT to /data/hanglian.');
requireIncludes('apps/api/scripts/start-cloud.mjs', "process.env.RUN_PRISMA_MIGRATE_DEPLOY ??= 'false'", 'Cloud startup must keep migration deploy disabled by default.');
requireIncludes('apps/api/scripts/start-cloud.mjs', 'if (isTrue(process.env.RUN_PRISMA_MIGRATE_DEPLOY))', 'Cloud startup must gate prisma migrate deploy.');
requireIncludes('deploy/sealos/api-storage-env.example', 'FILE_STORAGE_PROVIDER=local', 'Sealos env example must default to local provider.');
requireIncludes('deploy/sealos/api-storage-env.example', 'STORAGE_ROOT=/data/hanglian', 'Sealos env example must align storage root with the volume mount.');
requireIncludes('deploy/sealos/api-storage-env.example', 'DATABASE_URL=', 'Sealos env example must not contain a real database URL.');
requireIncludes('deploy/sealos/api-storage-env.example', 'RUN_PRISMA_MIGRATE_DEPLOY=false', 'Sealos env example must keep migrations disabled.');
requireIncludes('deploy/sealos/api-storage-env.example', 'S3_SECRET_ACCESS_KEY=', 'Sealos env example must keep S3 secret blank.');
requireNotIncludes('deploy/sealos/api-storage-env.example', 'postgresql://', 'Sealos env example must not include a PostgreSQL connection string.');
requireNotIncludes('deploy/sealos/api-storage-env.example', 'ALLOW_PRISMA_WRITE=true', 'Sealos env example must not enable Prisma writes.');

if (blockers.length) {
  console.error('\nCloud alignment check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('V3.10 cloud alignment check passed.');
