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
    fail(`缺少文件：${relativePath}`);
    return '';
  }
  return readFileSync(relativePath, 'utf8');
}

function sha256(relativePath) {
  return createHash('sha256').update(readFileSync(relativePath)).digest('hex');
}

function requireIncludes(file, needle, message) {
  if (!read(file).includes(needle)) fail(message);
}

function requireNotMatches(file, pattern, message) {
  if (pattern.test(read(file))) fail(message);
}

function gitBlobSha(relativePath) {
  return createHash('sha256').update(execFileSync('git', ['show', `HEAD:${relativePath}`])).digest('hex');
}

const dockerfile = read('Dockerfile.migrate');
const apiDockerfile = read('Dockerfile.api');
const wrapper = read('scripts/run-prisma-migrate-deploy.mjs');
const workflow = read('.github/workflows/build-images-manual.yml');
const packageLock = read('package-lock.json');

requireIncludes('Dockerfile.migrate', 'FROM node:22-alpine AS deps', 'Migration Runner 必须使用 API 兼容 Node 主版本。');
requireIncludes('Dockerfile.migrate', 'RUN npm ci', 'Migration Runner 必须使用 lockfile 安装依赖。');
requireIncludes('Dockerfile.migrate', 'PRISMA_CLI_VERSION=7.8.0', 'Migration Runner 必须标记 Prisma CLI 版本 7.8.0。');
requireIncludes('package-lock.json', '"node_modules/prisma"', 'package-lock 必须包含 Prisma CLI。');
requireIncludes('package-lock.json', '"version": "7.8.0"', 'package-lock 必须锁定 Prisma 7.8.0。');
requireIncludes('Dockerfile.migrate', 'COPY --chown=node:node apps/api/prisma ./apps/api/prisma', 'schema 和 migrations 必须复制到镜像。');
requireIncludes('Dockerfile.migrate', 'COPY --chown=node:node scripts/run-prisma-migrate-deploy.mjs', 'Migration wrapper 必须复制到镜像。');
requireIncludes('Dockerfile.migrate', 'USER node', 'Migration Runner 应使用非 root 用户。');
requireIncludes('Dockerfile.migrate', 'CMD ["npx", "prisma", "--version"]', '默认命令必须是只读命令。');

for (const [file, text] of [
  ['Dockerfile.migrate', dockerfile],
  ['Dockerfile.api', apiDockerfile],
]) {
  if (/ENV\s+DATABASE_URL|ARG\s+DATABASE_URL|postgres(?:ql)?:\/\//i.test(text)) {
    fail(`${file} 不得写入 DATABASE_URL 或数据库 URL。`);
  }
}

for (const forbidden of ['.env', '.env.local', 'apps/api/storage', 'metadata', 'uploads', 'tmp', 'local-test-assets', '.git']) {
  if (new RegExp(`COPY[^\\n]*${forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(dockerfile)) {
    fail(`Migration Runner 不得复制 ${forbidden}。`);
  }
}

if (/CMD\s+.*migrate\s+deploy|ENTRYPOINT\s+.*migrate\s+deploy/i.test(dockerfile)) {
  fail('Migration Runner 不得自动执行 migration。');
}

for (const needle of [
  "DATA_SOURCE: 'postgres'",
  "DB_TARGET: 'staging'",
  "ALLOW_TEST_DB_CONNECT: 'true'",
  "ALLOW_PRISMA_WRITE: 'true'",
  "RUN_PRISMA_MIGRATE_DEPLOY: 'true'",
  "MIGRATION_CONFIRMATION: 'APPLY_V318_MIGRATIONS_TO_STAGING'",
  "process.env.DB_TARGET === 'production'",
  'DATABASE_URL 未配置',
  "'prisma', 'migrate', 'deploy'",
]) {
  if (!wrapper.includes(needle)) fail(`Migration wrapper 缺少确认或执行逻辑：${needle}`);
}

for (const pattern of [
  /\bdb\s+push\b/i,
  /\bseed\b/i,
  /\bmigrate\s+reset\b/i,
  /\bmigrate\s+dev\b/i,
  /\bpsql\b/i,
]) {
  if (pattern.test(wrapper)) fail(`Migration wrapper 不得包含禁用命令：${pattern}`);
}

for (const file of [
  'apps/api/prisma/schema.prisma',
  'apps/api/prisma/migrations/migration_lock.toml',
  'apps/api/prisma/migrations/20260617000100_initial_schema/migration.sql',
  'apps/api/prisma/migrations/20260623010000_v318_persistence_upgrade/migration.sql',
]) {
  if (!existsSync(file)) fail(`缺少迁移运行所需文件：${file}`);
}

if (gitBlobSha('apps/api/prisma/migrations/20260617000100_initial_schema/migration.sql') !== expectedInitialSha) {
  fail('初始 migration Git blob SHA-256 不匹配。');
}

if (sha256('apps/api/prisma/migrations/20260623010000_v318_persistence_upgrade/migration.sql') !== expectedIncrementalSha) {
  fail('增量 migration SHA-256 不匹配。');
}

if (read('apps/api/prisma/migrations/migration_lock.toml').trim() !== 'provider = "postgresql"') {
  fail('migration_lock.toml provider 必须为 postgresql。');
}

requireIncludes('.github/workflows/build-images-manual.yml', 'feature/v3-18-postgres-foundation', 'Workflow 必须支持当前分支 push 触发。');
requireIncludes('.github/workflows/build-images-manual.yml', 'hanglian-control-api-migrate', 'Workflow 必须构建 Migration Runner 镜像。');
requireIncludes('.github/workflows/build-images-manual.yml', 'v3.18-postgres-${short_sha}', 'Workflow 必须生成 API V3.18 short SHA tag。');
requireIncludes('.github/workflows/build-images-manual.yml', 'v3.18-migrate-${short_sha}', 'Workflow 必须生成 Migration Runner V3.18 short SHA tag。');
requireIncludes('.github/workflows/build-images-manual.yml', 'v3.18-postgres-candidate', 'Workflow 必须生成 API candidate tag。');
requireIncludes('.github/workflows/build-images-manual.yml', 'v3.18-migrate-candidate', 'Workflow 必须生成 Migration Runner candidate tag。');
requireIncludes('.github/workflows/build-images-manual.yml', 'postgres-migration-image:check', 'Workflow 必须运行 Migration 镜像静态检查。');
requireIncludes('.github/workflows/build-images-manual.yml', 'docker pull "$api_image"', 'API smoke 前必须拉取刚推送的 API 镜像。');
requireIncludes('.github/workflows/build-images-manual.yml', 'docker pull "$image"', 'Migration Runner 离线验证前必须拉取刚推送的镜像。');
requireIncludes('.github/workflows/build-images-manual.yml', 'DATA_SOURCE=mock', 'API smoke 必须使用 mock 数据源。');
requireIncludes('.github/workflows/build-images-manual.yml', 'RUN_PRISMA_MIGRATE_DEPLOY=false', 'API smoke 必须禁用 migrate deploy。');
requireIncludes('.github/workflows/build-images-manual.yml', 'DATABASE_URL|S3_SECRET|TOKEN|SECRET|postgres', 'Smoke 检查必须防敏感信息泄露。');
requireNotMatches('.github/workflows/build-images-manual.yml', /:latest|:production|:stable/i, 'Workflow 不得使用 latest/production/stable tag。');
requireNotMatches('.github/workflows/build-images-manual.yml', /\bDATABASE_URL\s*:/i, 'Workflow 不得配置 DATABASE_URL。');
requireNotMatches('.github/workflows/build-images-manual.yml', /\bprisma\s+migrate\s+deploy\b/i, 'Workflow 不得执行 migrate deploy。');

if (/\bsealos\s+(apply|deploy|update|restart|delete|scale|create|run)\b/i.test(workflow)) {
  fail('Workflow 不得访问 Sealos。');
}
if (workflow.includes('psql')) fail('Workflow 不得运行 psql。');
if (path.sep === '\\' && dockerfile.includes('\\')) fail('Dockerfile.migrate 路径应保持容器兼容。');

if (failures.length > 0) {
  console.error(failures.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log('PostgreSQL migration image check passed.');
