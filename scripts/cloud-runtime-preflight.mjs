import { execFileSync } from 'node:child_process';
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

function gitLsFiles(pattern) {
  try {
    return execFileSync('git', ['ls-files', pattern], { cwd: root, encoding: 'utf8' })
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    return [];
  }
}

console.log('V3.11 cloud runtime preflight');
console.log('This check is local-only. It does not connect to Sealos, databases, S3, or GitHub Actions.');

[
  'Dockerfile.api',
  'Dockerfile.tablet',
  'apps/tablet/docker/nginx.conf',
  'apps/tablet/docker/entrypoint.sh',
  'apps/tablet/public/runtime-config.js',
  'apps/tablet/src/config/runtime-config.ts',
  'apps/tablet/src/config/api-base.ts',
  'apps/api/src/config/cors.config.ts',
  'apps/api/src/runtime/runtime.controller.ts',
  'apps/api/src/storage/controllers/storage-status.controller.ts',
  'apps/api/src/storage/storage-mount-check.service.ts',
  'apps/api/scripts/start-cloud.mjs',
  'deploy/sealos/api-persistent-volume-env.example',
  'deploy/sealos/tablet-env.example',
  'deploy/sealos/persistent-volume-mount.example.md',
  '.github/workflows/build-images-manual.yml',
].forEach((file) => read(file));

requireIncludes('Dockerfile.api', 'USER node', 'API Dockerfile must run as a non-root user.');
requireIncludes('Dockerfile.api', 'HEALTHCHECK', 'API Dockerfile must include a healthcheck.');
requireIncludes('Dockerfile.api', 'RUN_PRISMA_MIGRATE_DEPLOY=false', 'API Dockerfile must keep migration deploy disabled by default.');
requireIncludes('Dockerfile.api', 'STORAGE_ROOT=/data/hanglian', 'API Dockerfile must default STORAGE_ROOT to /data/hanglian.');
requireIncludes('Dockerfile.tablet', 'apps/tablet/docker/nginx.conf', 'Tablet Dockerfile must use the V3.11 Nginx config.');
requireIncludes('Dockerfile.tablet', 'RUNTIME_API_BASE_URL', 'Tablet Dockerfile must support runtime API configuration.');
requireIncludes('apps/api/src/config/cors.config.ts', 'CORS_ORIGINS', 'API CORS must support a comma-separated allowlist.');
requireIncludes('apps/api/src/config/cors.config.ts', 'CORS_ALLOW_CREDENTIALS', 'API CORS must support explicit credentials configuration.');
requireIncludes('apps/api/src/runtime/runtime.controller.ts', "Controller('runtime')", 'API runtime info controller must exist.');
requireIncludes('apps/api/src/runtime/runtime.controller.ts', "Get('info')", 'GET /api/runtime/info must exist.');
requireIncludes('apps/api/src/runtime/runtime.controller.ts', 'databaseConnected: false', 'Runtime info must not claim database connectivity.');
requireIncludes('apps/api/src/storage/controllers/storage-status.controller.ts', "Get('mount-readiness')", 'Storage mount readiness endpoint must exist.');
requireIncludes('apps/api/src/storage/storage-mount-check.service.ts', 'runProbe', 'Storage mount CLI probe service must exist.');
requireIncludes('apps/api/scripts/start-cloud.mjs', "process.env.DATA_SOURCE ??= 'mock'", 'Cloud startup must default DATA_SOURCE to mock.');
requireIncludes('apps/api/scripts/start-cloud.mjs', "process.env.RUN_PRISMA_MIGRATE_DEPLOY ??= 'false'", 'Cloud startup must default migration deploy to false.');
requireIncludes('apps/api/scripts/start-cloud.mjs', "process.env.DATA_SOURCE !== 'prisma'", 'Cloud startup must refuse migration outside prisma mode.');
requireIncludes('deploy/sealos/api-persistent-volume-env.example', 'STORAGE_ROOT=/data/hanglian', 'Sealos API env example must include persistent volume storage root.');
requireIncludes('deploy/sealos/api-persistent-volume-env.example', 'CORS_ORIGINS=https://YOUR_TABLET_DOMAIN', 'Sealos API env example must use placeholder Tablet domain.');
requireIncludes('deploy/sealos/tablet-env.example', 'RUNTIME_API_BASE_URL=https://YOUR_API_DOMAIN/api', 'Tablet env example must use placeholder API domain.');
requireIncludes('.github/workflows/build-images-manual.yml', 'workflow_dispatch', 'Image workflow must be manual only.');
requireIncludes('.github/workflows/build-images-manual.yml', 'docker/build-push-action', 'Image workflow must build container images.');
requireNotIncludes('deploy/sealos/api-persistent-volume-env.example', 'postgresql://', 'Sealos API env example must not contain a database connection string.');
requireNotIncludes('deploy/sealos/tablet-env.example', 'fyeboolnlvqv', 'Tablet env example must not contain a real domain.');
requireNotIncludes('apps/tablet/src/config/api-base.ts', 'fyeboolnlvqv', 'Tablet API base config must not contain the old real Sealos domain.');
requireNotIncludes('.github/workflows/build-images-manual.yml', 'migrate', 'Manual image workflow must not run migrations.');
requireNotIncludes('.github/workflows/build-images-manual.yml', 'seed', 'Manual image workflow must not run seed scripts.');

const envLocalTracked = gitLsFiles('**/.env.local');
const uploadTracked = gitLsFiles('apps/api/storage/uploads/*').filter((file) => !file.endsWith('.gitkeep'));
const metadataTracked = gitLsFiles('apps/api/storage/metadata/*').filter((file) => !file.endsWith('.gitkeep'));
if (envLocalTracked.length) blockers.push(`Tracked local env files: ${envLocalTracked.join(', ')}`);
if (uploadTracked.length) blockers.push(`Tracked upload runtime files: ${uploadTracked.join(', ')}`);
if (metadataTracked.length) blockers.push(`Tracked metadata runtime files: ${metadataTracked.join(', ')}`);

if (blockers.length) {
  console.error('\nCloud runtime preflight failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('V3.11 cloud runtime preflight passed.');
