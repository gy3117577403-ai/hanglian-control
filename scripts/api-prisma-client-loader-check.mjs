#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runLoaderCheck(cwd, script) {
  const result = spawnSync('node', ['-e', script], {
    cwd,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`Prisma client loader check failed for cwd=${cwd}: ${result.stderr || result.stdout}`);
  }
}

const rootScript = `
const { loadGeneratedPrismaClient } = require('./apps/api/dist/src/database/prisma-client-loader.js');
const { PrismaClient } = loadGeneratedPrismaClient();
if (typeof PrismaClient !== 'function') throw new Error('PrismaClient constructor missing');
console.log('root cwd loader ok');
`;

const apiScript = `
const { loadGeneratedPrismaClient } = require('./dist/src/database/prisma-client-loader.js');
const { PrismaClient } = loadGeneratedPrismaClient();
if (typeof PrismaClient !== 'function') throw new Error('PrismaClient constructor missing');
console.log('api cwd loader ok');
`;

const sourceClient = resolve(root, 'apps/api/generated/prisma/client.ts');
const compiledLoader = resolve(root, 'apps/api/dist/src/database/prisma-client-loader.js');

assert(existsSync(sourceClient), `Generated Prisma client source is missing: ${sourceClient}`);
assert(existsSync(compiledLoader), 'Compiled API Prisma client loader is missing. Run npm run build -w api first.');

runLoaderCheck(root, rootScript);
runLoaderCheck(resolve(root, 'apps/api'), apiScript);

console.log('API Prisma client loader cwd check passed.');
