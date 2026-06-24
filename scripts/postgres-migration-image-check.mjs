#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const failures = [];
const expectedInitialSha = 'ef2508e428b7c3264bd06a353036a496afe0028a6ce849cf143f0f40fec6f3f6';
const expectedIncrementalSha = '027c925924c1e6e5f0ebf153a0a58a72b7c993dcc1db41cf6e0267d121666a8d';

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  if (!existsSync(relativePath)) {
    fail(`Missing file: ${relativePath}`);
    return '';
  }
  return readFileSync(relativePath, 'utf8');
}

function sha256(relativePath) {
  return createHash('sha256').update(readFileSync(relativePath)).digest('hex');
}

function gitBlobSha(relativePath) {
  return createHash('sha256').update(execFileSync('git', ['show', `HEAD:${relativePath}`])).digest('hex');
}

function requireIncludes(file, needle, message) {
  if (!read(file).includes(needle)) fail(message);
}

function requireNotIncludes(file, needle, message) {
  if (read(file).includes(needle)) fail(message);
}

function requireNotMatches(file, pattern, message) {
  if (pattern.test(read(file))) fail(message);
}

const prismaConfig = read('apps/api/prisma.config.ts');
const dockerfile = read('Dockerfile.migrate');
const apiDockerfile = read('Dockerfile.api');
const wrapper = read('scripts/run-prisma-migrate-deploy.mjs');
const workflow = read('.github/workflows/build-images-manual.yml');
const packageLock = read('package-lock.json');

requireIncludes('apps/api/prisma.config.ts', 'defineConfig', 'Prisma config must use defineConfig.');
requireIncludes('apps/api/prisma.config.ts', 'schema: "prisma/schema.prisma"', 'Prisma config schema path must be relative to apps/api.');
requireIncludes('apps/api/prisma.config.ts', 'path: "prisma/migrations"', 'Prisma config migrations path must be relative to apps/api.');
requireIncludes('apps/api/prisma.config.ts', 'datasource', 'Prisma config must include datasource.');
requireIncludes('apps/api/prisma.config.ts', 'url: process.env.DATABASE_URL ?? ""', 'Prisma config datasource.url must read process.env.DATABASE_URL with an empty fallback.');
requireNotIncludes('apps/api/prisma.config.ts', 'dotenv/config', 'Prisma config must not auto-load dotenv.');
requireNotIncludes('apps/api/prisma.config.ts', 'env("DATABASE_URL")', 'Prisma config must not use env("DATABASE_URL").');
requireNotIncludes('apps/api/prisma.config.ts', 'shadowDatabaseUrl', 'Prisma config must not define shadowDatabaseUrl.');
if (/postgres(?:ql)?:\/\//i.test(prismaConfig)) fail('Prisma config must not hard-code a database URL.');

requireIncludes('Dockerfile.migrate', 'FROM node:22-alpine AS deps', 'Migration Runner must use Node 22 alpine.');
requireIncludes('Dockerfile.migrate', 'RUN npm ci', 'Migration Runner must install dependencies from the lockfile.');
requireIncludes('Dockerfile.migrate', 'PRISMA_CLI_VERSION=7.8.0', 'Migration Runner must mark Prisma CLI version 7.8.0.');
requireIncludes('Dockerfile.migrate', 'COPY --chown=node:node apps/api/prisma.config.ts ./apps/api/prisma.config.ts', 'Migration Runner image must copy apps/api/prisma.config.ts.');
requireIncludes('Dockerfile.migrate', 'COPY --chown=node:node apps/api/prisma ./apps/api/prisma', 'Migration Runner image must copy schema and migrations.');
requireIncludes('Dockerfile.migrate', 'COPY --chown=node:node scripts/run-prisma-migrate-deploy.mjs', 'Migration Runner image must copy the migration wrapper.');
requireIncludes('Dockerfile.migrate', 'COPY --chown=node:node scripts/document-version-rules.mjs ./scripts/document-version-rules.mjs', 'Migration Runner image must copy document version rules helper.');
requireIncludes('Dockerfile.migrate', 'COPY --chown=node:node scripts/json-migration-plan.mjs ./scripts/json-migration-plan.mjs', 'Migration Runner image must copy JSON migration plan CLI.');
requireIncludes('Dockerfile.migrate', 'COPY --chown=node:node scripts/json-migration-dry-run.mjs ./scripts/json-migration-dry-run.mjs', 'Migration Runner image must copy JSON migration dry-run CLI.');
requireIncludes('Dockerfile.migrate', 'COPY --chown=node:node scripts/json-to-postgres-import.mjs ./scripts/json-to-postgres-import.mjs', 'Migration Runner image must copy JSON import CLI.');
requireIncludes('Dockerfile.migrate', 'COPY --chown=node:node scripts/postgres-parity-check.mjs ./scripts/postgres-parity-check.mjs', 'Migration Runner image must copy PostgreSQL parity CLI.');
requireIncludes('Dockerfile.migrate', 'USER node', 'Migration Runner should use the non-root node user.');
requireIncludes('Dockerfile.migrate', 'CMD ["npx", "prisma", "--version"]', 'Migration Runner default command must be read-only.');
requireIncludes('package-lock.json', '"node_modules/prisma"', 'package-lock must include Prisma CLI.');
requireIncludes('package-lock.json', '"version": "7.8.0"', 'package-lock must lock Prisma 7.8.0.');

for (const [file, text] of [
  ['Dockerfile.migrate', dockerfile],
  ['Dockerfile.api', apiDockerfile],
]) {
  if (/ENV\s+DATABASE_URL|ARG\s+DATABASE_URL|postgres(?:ql)?:\/\//i.test(text)) {
    fail(`${file} must not embed DATABASE_URL or a database URL.`);
  }
}

for (const forbidden of ['.env', '.env.local', 'apps/api/storage', 'metadata', 'uploads', 'tmp', 'local-test-assets', '.git']) {
  if (new RegExp(`COPY[^\\n]*${forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(dockerfile)) {
    fail(`Migration Runner image must not copy ${forbidden}.`);
  }
}

if (/CMD\s+.*migrate\s+deploy|ENTRYPOINT\s+.*migrate\s+deploy/i.test(dockerfile)) {
  fail('Migration Runner must not automatically run migration.');
}

for (const needle of [
  "DATA_SOURCE: 'postgres'",
  "DB_TARGET: 'staging'",
  "ALLOW_TEST_DB_CONNECT: 'true'",
  "ALLOW_PRISMA_WRITE: 'true'",
  "RUN_PRISMA_MIGRATE_DEPLOY: 'true'",
  "MIGRATION_CONFIRMATION: 'APPLY_V318_MIGRATIONS_TO_STAGING'",
  "process.env.DB_TARGET === 'production'",
  'DATABASE_URL is missing',
  "'prisma', 'migrate', 'deploy'",
  '--config=',
  'configLoaded: true',
  'datasourceConfigured: true',
  'schemaPathConfigured: true',
  'migrationsPathConfigured: true',
]) {
  if (!wrapper.includes(needle)) fail(`Migration wrapper is missing required safety or execution logic: ${needle}`);
}
if (wrapper.includes("'--schema'") || wrapper.includes('"--schema"')) {
  fail('Migration wrapper must not rely on --schema.');
}

for (const pattern of [
  /\bdb\s+push\b/i,
  /\bseed\b/i,
  /\bmigrate\s+reset\b/i,
  /\bmigrate\s+dev\b/i,
  /\bmigrate\s+resolve\b/i,
  /\bpsql\b/i,
]) {
  if (pattern.test(wrapper)) fail(`Migration wrapper must not contain forbidden command: ${pattern}`);
}

for (const file of [
  'apps/api/prisma.config.ts',
  'apps/api/prisma/schema.prisma',
  'apps/api/prisma/migrations/migration_lock.toml',
  'apps/api/prisma/migrations/20260617000100_initial_schema/migration.sql',
  'apps/api/prisma/migrations/20260623010000_v318_persistence_upgrade/migration.sql',
  'scripts/document-version-rules.mjs',
  'scripts/json-migration-plan.mjs',
  'scripts/json-migration-dry-run.mjs',
  'scripts/json-to-postgres-import.mjs',
  'scripts/postgres-parity-check.mjs',
]) {
  if (!existsSync(file)) fail(`Missing migration runner required file: ${file}`);
}

if (gitBlobSha('apps/api/prisma/migrations/20260617000100_initial_schema/migration.sql') !== expectedInitialSha) {
  fail('Initial migration Git blob SHA-256 mismatch.');
}

if (sha256('apps/api/prisma/migrations/20260623010000_v318_persistence_upgrade/migration.sql') !== expectedIncrementalSha) {
  fail('Incremental migration SHA-256 mismatch.');
}

if (read('apps/api/prisma/migrations/migration_lock.toml').trim() !== 'provider = "postgresql"') {
  fail('migration_lock.toml provider must be postgresql.');
}

requireIncludes('.github/workflows/build-images-manual.yml', 'feature/v3-18-postgres-foundation', 'Workflow must support current branch push trigger.');
requireIncludes('.github/workflows/build-images-manual.yml', 'hanglian-control-api-migrate', 'Workflow must build Migration Runner image.');
requireIncludes('.github/workflows/build-images-manual.yml', 'v3.18-import-finished-images-${short_sha}', 'Workflow must generate finished-images Migration Runner tag.');
requireIncludes('.github/workflows/build-images-manual.yml', 'v3.18-import-candidate', 'Workflow must generate import candidate Migration Runner tag.');
requireIncludes('.github/workflows/build-images-manual.yml', 'postgres-migration-image:check', 'Workflow must run Migration image static check.');
requireIncludes('.github/workflows/build-images-manual.yml', 'docker pull "$image"', 'Workflow must pull the pushed Migration Runner image before offline verification.');
requireIncludes('.github/workflows/build-images-manual.yml', 'apps/api/prisma.config.ts', 'Workflow must verify prisma.config.ts inside the image.');
requireIncludes('.github/workflows/build-images-manual.yml', 'scripts/document-version-rules.mjs', 'Workflow must verify document version rules helper inside the image.');
requireIncludes('.github/workflows/build-images-manual.yml', 'scripts/json-migration-dry-run.mjs', 'Workflow must verify JSON dry-run CLI inside the image.');
requireIncludes('.github/workflows/build-images-manual.yml', 'scripts/json-to-postgres-import.mjs', 'Workflow must verify JSON import CLI inside the image.');
requireIncludes('.github/workflows/build-images-manual.yml', 'process.env.DATABASE_URL ?? ""', 'Workflow must verify Prisma config datasource.url.');
requireIncludes('.github/workflows/build-images-manual.yml', '--config=', 'Workflow must verify wrapper uses --config.');
requireIncludes('.github/workflows/build-images-manual.yml', 'DATA_SOURCE=mock', 'API smoke must use mock data source.');
requireIncludes('.github/workflows/build-images-manual.yml', 'RUN_PRISMA_MIGRATE_DEPLOY=false', 'API smoke must disable migrate deploy.');
requireIncludes(
  '.github/workflows/build-images-manual.yml',
  'DATABASE_URL|S3_SECRET|SEALOS_TOKEN|GITHUB_TOKEN|WECHAT.*SECRET|postgres(?:ql)?:\\/\\/|password',
  'Smoke check must block sensitive runtime output without flagging plain stage names.',
);
requireNotMatches('.github/workflows/build-images-manual.yml', /:latest|:production|:stable/i, 'Workflow must not use latest/production/stable tags.');
requireNotMatches('.github/workflows/build-images-manual.yml', /\bDATABASE_URL\s*:/i, 'Workflow must not configure DATABASE_URL.');
requireNotMatches('.github/workflows/build-images-manual.yml', /\bprisma\s+migrate\s+deploy\b/i, 'Workflow must not execute migrate deploy.');

if (/\bsealos\s+(apply|deploy|update|restart|delete|scale|create|run)\b/i.test(workflow)) {
  fail('Workflow must not operate Sealos.');
}
if (workflow.includes('psql')) fail('Workflow must not run psql.');
if (path.sep === '\\' && dockerfile.includes('\\')) fail('Dockerfile.migrate paths must stay container-compatible.');

if (failures.length > 0) {
  console.error(failures.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log('PostgreSQL migration image check passed.');
