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
  fail('Refusing to run: DB_TARGET=production is not allowed.');
}

for (const [key, expected] of Object.entries(requiredEnv)) {
  if (process.env[key] !== expected) {
    fail(`Refusing to run: ${key} is not set to the required confirmation value.`);
  }
}

if (!isTrue(process.env.ALLOW_TEST_DB_CONNECT)) fail('Refusing to run: database connection gate is closed.');
if (!isTrue(process.env.ALLOW_PRISMA_WRITE)) fail('Refusing to run: Prisma write gate is closed.');
if (!isTrue(process.env.RUN_PRISMA_MIGRATE_DEPLOY)) fail('Refusing to run: migrate deploy gate is closed.');
if (!process.env.DATABASE_URL) fail('Refusing to run: DATABASE_URL is missing.');

const configPath = path.resolve('apps/api/prisma.config.ts');
const schemaPath = 'apps/api/prisma/schema.prisma';
const migrationsPath = 'apps/api/prisma/migrations';
if (!existsSync(configPath)) fail('Refusing to run: prisma.config.ts is missing.');
if (!existsSync(schemaPath)) fail('Refusing to run: schema.prisma is missing.');
if (!existsSync(migrationsPath)) fail('Refusing to run: migrations directory is missing.');

const migrationCount = readdirSync(migrationsPath, { withFileTypes: true }).filter((entry) => entry.isDirectory()).length;

console.log(
  JSON.stringify(
    {
      target: 'staging',
      configLoaded: true,
      datasourceConfigured: true,
      schemaPathConfigured: true,
      migrationsPathConfigured: true,
      migrationCount,
      command: 'prisma migrate deploy --config=/app/apps/api/prisma.config.ts',
    },
    null,
    2,
  ),
);

const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(npxCommand, ['prisma', 'migrate', 'deploy', `--config=${path.normalize(configPath)}`], {
  cwd: process.cwd(),
  env: process.env,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

if (result.stdout) process.stdout.write(sanitize(result.stdout));
if (result.stderr) process.stderr.write(sanitize(result.stderr));

process.exit(result.status ?? 1);
