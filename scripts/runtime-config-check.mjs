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

console.log('V3.11 runtime config check');
console.log('This check is local-only. It does not start servers or access the network.');

requireIncludes('apps/tablet/public/runtime-config.js', 'window.__HANGLIAN_RUNTIME_CONFIG__', 'runtime-config.js must expose the V3.11 public runtime config object.');
requireIncludes('apps/tablet/public/runtime-config.js', 'API_BASE_URL: ""', 'runtime-config.js must keep API_BASE_URL empty by default.');
requireIncludes('apps/tablet/src/config/runtime-config.ts', 'readPublicRuntimeConfig', 'Tablet must read public runtime config.');
requireIncludes('apps/tablet/src/config/runtime-config.ts', 'normalizeApiBaseUrl', 'Tablet must normalize API base URLs.');
requireIncludes('apps/tablet/src/config/runtime-config.ts', 'resolveAutomaticApiBaseUrl', 'Tablet must keep local/LAN fallback logic.');
requireIncludes('apps/tablet/src/config/api-base.ts', 'readPublicRuntimeConfig().API_BASE_URL', 'Runtime API URL must take priority over build env and stored modes.');
requireIncludes('apps/tablet/src/config/api-base.ts', 'import.meta.env.VITE_API_BASE_URL', 'Build-time VITE_API_BASE_URL fallback must remain available.');
requireIncludes('apps/tablet/src/config/api-base.ts', 'resolveAutomaticApiBaseUrl()', 'Local/LAN automatic fallback must remain available.');
requireIncludes('apps/tablet/docker/entrypoint.sh', 'RUNTIME_API_BASE_URL', 'Tablet entrypoint must use RUNTIME_API_BASE_URL.');
requireIncludes('apps/tablet/docker/entrypoint.sh', 'RUNTIME_APP_ENV', 'Tablet entrypoint must use RUNTIME_APP_ENV.');
requireIncludes('apps/tablet/docker/entrypoint.sh', 'RUNTIME_STORAGE_MODE', 'Tablet entrypoint must use RUNTIME_STORAGE_MODE.');
requireIncludes('apps/tablet/docker/nginx.conf', 'location = /runtime-config.js', 'Nginx must special-case runtime-config.js.');
requireIncludes('apps/tablet/docker/nginx.conf', 'no-store', 'runtime-config.js must not be long cached.');
requireIncludes('apps/tablet/docker/nginx.conf', 'try_files $uri $uri/ /index.html', 'Nginx must support SPA route fallback.');
requireNotIncludes('apps/tablet/public/runtime-config.js', 'DATABASE_URL', 'runtime-config.js must not contain database config.');
requireNotIncludes('apps/tablet/docker/entrypoint.sh', 'DATABASE_URL', 'Tablet entrypoint must not write DATABASE_URL.');
requireNotIncludes('apps/tablet/docker/entrypoint.sh', 'S3_SECRET_ACCESS_KEY', 'Tablet entrypoint must not write S3 secrets.');

if (blockers.length) {
  console.error('\nRuntime config check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('V3.11 runtime config check passed.');
