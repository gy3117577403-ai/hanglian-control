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

function scanWorkflowRunCommands(workflow) {
  const riskyCommandPatterns = [
    /\bdb:readonly-check\b/i,
    /\bprisma\s+migrate\b/i,
    /\bprisma\s+db\s+push\b/i,
    /\bprisma\s+db\s+seed\b/i,
    /\bprisma:seed:test-db\b/i,
    /\bsealos\b.*\b(apply|deploy|update|restart|delete|scale)\b/i,
    /\bs3\b.*\b(smoke|connect|create|bucket)\b/i,
    /\bDATABASE_URL\b/i,
    /\bS3_SECRET_ACCESS_KEY\b/i,
    /\bAWS_SECRET_ACCESS_KEY\b/i,
  ];

  const lines = workflow.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('echo ')) continue;
    if (riskyCommandPatterns.some((pattern) => pattern.test(trimmed))) {
      blockers.push(`Workflow run command contains a forbidden operation: ${trimmed}`);
    }
  }
}

console.log('V3.12 image build config check');
console.log('This check is local-only. It does not access GitHub, Sealos, databases, or S3.');

const workflowPath = '.github/workflows/build-images-manual.yml';
const workflow = read(workflowPath);

requireIncludes(workflowPath, 'name: Build API and Tablet Images', 'Workflow name must be easy to identify.');
requireIncludes(workflowPath, 'workflow_dispatch:', 'Workflow must keep manual dispatch.');
requireIncludes(workflowPath, 'push:', 'Workflow must support V3.12 branch push trigger.');
requireIncludes(workflowPath, 'feature/v3-12-image-build-validation', 'Workflow push trigger must be limited to the V3.12 branch.');
requireNotIncludes(workflowPath, 'feature/**', 'Workflow must not trigger for every feature branch.');
requireIncludes(workflowPath, 'contents: read', 'Workflow must use minimal contents permission.');
requireIncludes(workflowPath, 'packages: write', 'Workflow must use package write permission.');
requireIncludes(workflowPath, 'secrets.GITHUB_TOKEN', 'Workflow must authenticate with the GitHub Actions token.');
requireIncludes(workflowPath, 'Dockerfile.api', 'Workflow must build API image.');
requireIncludes(workflowPath, 'Dockerfile.tablet', 'Workflow must build Tablet image.');
requireIncludes(workflowPath, 'ghcr.io/${owner_lower}/${repo_name}-api', 'API image name must target GHCR.');
requireIncludes(workflowPath, 'ghcr.io/${owner_lower}/${repo_name}-tablet', 'Tablet image name must target GHCR.');
requireIncludes(workflowPath, 'v3.12-${short_sha}', 'Workflow must create a v3.12 short-SHA tag.');
requireIncludes(workflowPath, 'sha-${short_sha}', 'Workflow must create a SHA tag.');
requireIncludes(workflowPath, 'v3.12-candidate', 'Workflow may create the V3.12 candidate tag.');
requireNotIncludes(workflowPath, ':latest', 'Workflow must not use latest tag.');
requireNotIncludes(workflowPath, ':production', 'Workflow must not use production tag.');
requireNotIncludes(workflowPath, ':stable', 'Workflow must not use stable tag.');
requireIncludes(workflowPath, 'org.opencontainers.image.source', 'Workflow must set OCI source label.');
requireIncludes(workflowPath, 'org.opencontainers.image.revision', 'Workflow must set OCI revision label.');
requireIncludes(workflowPath, 'org.opencontainers.image.version', 'Workflow must set OCI version label.');
requireIncludes(workflowPath, 'npm ci', 'Workflow must install dependencies before checks.');
requireIncludes(workflowPath, 'npm run security:check', 'Workflow must run security check before image build.');
requireIncludes(workflowPath, 'npm run storage-flow:check', 'Workflow must run storage flow check before image build.');
requireIncludes(workflowPath, 'npm run cloud-alignment:check', 'Workflow must run cloud alignment check before image build.');
requireIncludes(workflowPath, 'npm run cloud:runtime-preflight', 'Workflow must run cloud runtime preflight before image build.');
requireIncludes(workflowPath, 'npm run runtime-config:check', 'Workflow must run runtime config check before image build.');
requireIncludes(workflowPath, 'npm run build', 'Workflow must run build before image build.');
requireIncludes(workflowPath, 'npm run check', 'Workflow must run full check before image build.');
requireNotIncludes(workflowPath, 'db:readonly-check', 'Workflow must not run database readonly check.');
requireNotIncludes(workflowPath, 'prisma migrate', 'Workflow must not run Prisma migrate.');
requireNotIncludes(workflowPath, 'prisma db push', 'Workflow must not run Prisma db push.');
requireNotIncludes(workflowPath, 'prisma db seed', 'Workflow must not run Prisma db seed.');
requireNotIncludes(workflowPath, 'prisma:seed:test-db', 'Workflow must not run test-db seed.');
requireNotIncludes(workflowPath, 'DATABASE_URL:', 'Workflow must not define DATABASE_URL.');
requireNotIncludes(workflowPath, 'S3_SECRET_ACCESS_KEY:', 'Workflow must not define S3 secrets.');
requireNotIncludes(workflowPath, 'AWS_SECRET_ACCESS_KEY:', 'Workflow must not define AWS secrets.');
scanWorkflowRunCommands(workflow);

requireRegex('Dockerfile.api', /LABEL org\.opencontainers\.image\.source=\$OCI_SOURCE/, 'API Dockerfile must include OCI source label.');
requireRegex('Dockerfile.api', /LABEL org\.opencontainers\.image\.revision=\$OCI_REVISION/, 'API Dockerfile must include OCI revision label.');
requireRegex('Dockerfile.api', /LABEL org\.opencontainers\.image\.version=\$OCI_VERSION/, 'API Dockerfile must include OCI version label.');
requireRegex('Dockerfile.tablet', /LABEL org\.opencontainers\.image\.source=\$OCI_SOURCE/, 'Tablet Dockerfile must include OCI source label.');
requireRegex('Dockerfile.tablet', /LABEL org\.opencontainers\.image\.revision=\$OCI_REVISION/, 'Tablet Dockerfile must include OCI revision label.');
requireRegex('Dockerfile.tablet', /LABEL org\.opencontainers\.image\.version=\$OCI_VERSION/, 'Tablet Dockerfile must include OCI version label.');

if (blockers.length) {
  console.error('\nImage build config check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('V3.12 image build config check passed.');
