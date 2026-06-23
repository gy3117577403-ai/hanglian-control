#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const requiredEnv = {
  DATA_SOURCE: 'postgres',
  DB_TARGET: 'staging',
  ALLOW_TEST_DB_CONNECT: 'true',
  ALLOW_PRISMA_WRITE: 'true',
  RUN_PRISMA_MIGRATE_DEPLOY: 'true',
  MIGRATION_CONFIRMATION: 'APPLY_V318_MIGRATIONS_TO_STAGING',
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

function isTrue(value) {
  return String(value ?? '').toLowerCase() === 'true';
}

function sanitize(text) {
  let output = String(text ?? '');
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) output = output.split(databaseUrl).join('[redacted:DATABASE_URL]');
  return output.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, '[redacted:postgres-url]');
}

if (process.env.DB_TARGET === 'production') {
  fail('拒绝执行：DB_TARGET=production。');
}

for (const [key, expected] of Object.entries(requiredEnv)) {
  if (process.env[key] !== expected) {
    fail(`拒绝执行：${key} 未设置为预期确认值。`);
  }
}

if (!isTrue(process.env.ALLOW_TEST_DB_CONNECT)) fail('拒绝执行：测试数据库连接闸门未开启。');
if (!isTrue(process.env.ALLOW_PRISMA_WRITE)) fail('拒绝执行：Prisma 写入闸门未开启。');
if (!isTrue(process.env.RUN_PRISMA_MIGRATE_DEPLOY)) fail('拒绝执行：migrate deploy 闸门未开启。');
if (!process.env.DATABASE_URL) fail('拒绝执行：DATABASE_URL 未配置。');

const schemaPath = 'apps/api/prisma/schema.prisma';
const migrationsPath = 'apps/api/prisma/migrations';
if (!existsSync(schemaPath)) fail('拒绝执行：schema.prisma 不存在。');
if (!existsSync(migrationsPath)) fail('拒绝执行：migrations 目录不存在。');

const migrationCount = readdirSync(migrationsPath, { withFileTypes: true }).filter((entry) => entry.isDirectory()).length;

console.log(
  JSON.stringify(
    {
      target: 'staging',
      schemaConfigured: true,
      migrationCount,
      command: 'prisma migrate deploy',
    },
    null,
    2,
  ),
);

const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(npxCommand, ['prisma', 'migrate', 'deploy', '--schema', path.normalize(schemaPath)], {
  cwd: process.cwd(),
  env: process.env,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

if (result.stdout) process.stdout.write(sanitize(result.stdout));
if (result.stderr) process.stderr.write(sanitize(result.stderr));

process.exit(result.status ?? 1);
