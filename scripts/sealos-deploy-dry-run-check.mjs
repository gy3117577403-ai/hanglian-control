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

function requireRegex(relativePath, regex, message) {
  if (!regex.test(read(relativePath))) blockers.push(message);
}

function scanForRealSecrets(relativePath) {
  const content = read(relativePath);
  const riskyPatterns = [
    /postgresql:\/\/(?!USER:PASSWORD@HOST)[^\s<]+@/i,
    /DATABASE_URL\s*=\s*postgresql:\/\//i,
    /(S3_SECRET_ACCESS_KEY|AWS_SECRET_ACCESS_KEY|GITHUB_TOKEN|SEALOS_TOKEN)\s*=\s*[^<\s]+/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/i,
    /https:\/\/(?!YOUR_)[a-z0-9.-]+\.(sealos|sealoshzh|site|run)/i,
  ];

  if (riskyPatterns.some((pattern) => pattern.test(content))) {
    blockers.push(`${relativePath} appears to contain a real secret, credential, or domain.`);
  }
}

console.log('V3.12 Sealos deploy dry-run check');
console.log('This check is local-only. It does not access Sealos, databases, S3, or GitHub.');

const parameterSheet = 'deploy/sealos/v3.12-deployment-parameter-sheet.md';
const diffTemplate = 'deploy/sealos/v3.12-existing-app-diff-template.md';
const composeFile = 'deploy/local/docker-compose.v3.12-smoke.yml';
const workflowFile = '.github/workflows/build-images-manual.yml';

[parameterSheet, diffTemplate, composeFile, workflowFile].forEach((file) => read(file));

requireIncludes(parameterSheet, 'hanglian-control-api-v312', 'API suggested app name must be documented.');
requireIncludes(parameterSheet, 'hanglian-control-tablet-v312', 'Tablet suggested app name must be documented.');
requireIncludes(parameterSheet, 'ghcr.io/gy3117577403-ai/hanglian-control-api:v3.12-<SHA>', 'API image placeholder must use V3.12 SHA tag.');
requireIncludes(parameterSheet, 'ghcr.io/gy3117577403-ai/hanglian-control-tablet:v3.12-<SHA>', 'Tablet image placeholder must use V3.12 SHA tag.');
requireIncludes(parameterSheet, 'Container port | `3000`', 'API container port must be 3000.');
requireIncludes(parameterSheet, 'Container port | `80`', 'Tablet container port must be 80.');
requireIncludes(parameterSheet, 'Persistent volume mount | `/data/hanglian`', 'API persistent volume mount must be /data/hanglian.');
requireIncludes(parameterSheet, 'Persistent volume | Not required', 'Tablet must not require a business persistent volume.');
requireIncludes(parameterSheet, 'DATA_SOURCE=mock', 'DATA_SOURCE must stay mock.');
requireIncludes(parameterSheet, 'RUN_PRISMA_MIGRATE_DEPLOY=false', 'Migration deploy must be false.');
requireIncludes(parameterSheet, 'ALLOW_TEST_DB_CONNECT=false', 'Database connect flag must be false.');
requireIncludes(parameterSheet, 'ALLOW_PRISMA_WRITE=false', 'Prisma write flag must be false.');
requireIncludes(parameterSheet, 'ALLOW_DESTRUCTIVE_DB_ACTIONS=false', 'Destructive DB flag must be false.');
requireIncludes(parameterSheet, 'RUNTIME_API_BASE_URL=https://YOUR_API_DOMAIN/api', 'Tablet API URL must use a placeholder domain.');
requireRegex(
  parameterSheet,
  /^((?!ghcr\.io\/gy3117577403-ai\/hanglian-control-(api|tablet):(latest|production|stable)).)*$/s,
  'Parameter sheet must not use latest, production, or stable on image values.',
);

requireIncludes(diffTemplate, 'Existing app `hanglianchaxun`', 'Existing app diff template must mention the known app for manual comparison.');
requireIncludes(diffTemplate, 'To be confirmed manually', 'Existing app state must remain a manual confirmation placeholder.');

requireIncludes(composeFile, 'hanglian_v312_data', 'Local smoke compose must define a named volume.');
requireIncludes(composeFile, '/data/hanglian', 'Local smoke compose must mount API data at /data/hanglian.');
requireIncludes(composeFile, '3000:3000', 'Local smoke compose must expose API on 3000.');
requireIncludes(composeFile, '8080:80', 'Local smoke compose must expose Tablet on 8080.');
requireIncludes(composeFile, 'DATA_SOURCE: mock', 'Local smoke compose must keep DATA_SOURCE mock.');
requireIncludes(composeFile, 'ALLOW_PRISMA_WRITE: "false"', 'Local smoke compose must disable Prisma writes.');
requireIncludes(composeFile, 'ALLOW_DESTRUCTIVE_DB_ACTIONS: "false"', 'Local smoke compose must disable destructive DB actions.');
requireIncludes(composeFile, 'RUNTIME_API_BASE_URL: http://localhost:3000/api', 'Local smoke Tablet must point to localhost API.');
requireNotIncludes(composeFile, 'DATABASE_URL', 'Local smoke compose must not define DATABASE_URL.');
requireNotIncludes(composeFile, 'S3_SECRET_ACCESS_KEY', 'Local smoke compose must not define S3 secrets.');

requireIncludes(workflowFile, 'feature/v3-12-image-build-validation', 'Workflow must be limited to the V3.12 branch.');
requireNotIncludes(workflowFile, 'sealosctl', 'Workflow must not call Sealos tooling.');
requireNotIncludes(workflowFile, 'kubectl', 'Workflow must not deploy Kubernetes resources.');

requireRegex('package.json', /"sealos:deploy-dry-run":\s*"node scripts\/sealos-deploy-dry-run-check\.mjs"/, 'Root package must expose sealos:deploy-dry-run.');
requireRegex('package.json', /"image-build:check":\s*"node scripts\/image-build-config-check\.mjs"/, 'Root package must expose image-build:check.');

[parameterSheet, diffTemplate, composeFile].forEach(scanForRealSecrets);

if (blockers.length) {
  console.error('\nSealos deploy dry-run check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('V3.12 Sealos deploy dry-run check passed.');
