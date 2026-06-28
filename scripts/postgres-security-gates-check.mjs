#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failures = [];

function includes(path, text, message) {
  if (!readFileSync(path, 'utf8').includes(text)) failures.push(message);
}

function rejects(command, args, message) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status === 0) failures.push(message);
}

includes('apps/api/src/database/database-safety.ts', "target === 'staging'", '未拒绝非 staging DB_TARGET。');
includes('apps/api/src/database/database-safety.ts', 'DATABASE_URL 缺失或仍是示例值。', '缺少 DATABASE_URL 缺失提示。');
includes('apps/api/src/database/database-safety.ts', 'ALLOW_TEST_DB_CONNECT 未开启', '缺少 ALLOW_TEST_DB_CONNECT 闸门。');
includes('apps/api/src/database/database-safety.ts', 'PostgreSQL 写入闸门尚未开启。', '写入闸门关闭未拒绝。');
includes('apps/api/src/database/database-safety.ts', '破坏性数据库操作闸门保持关闭。', '破坏性闸门未默认关闭。');
includes('apps/api/src/database/database-safety.ts', 'RUN_PRISMA_MIGRATE_DEPLOY 必须保持 false', 'RUN_PRISMA_MIGRATE_DEPLOY 未被禁止。');
includes('apps/api/src/database/prisma.service.ts', 'sanitizeError', 'Prisma 连接错误未脱敏。');
includes('scripts/postgres-parity-check.mjs', '禁止通过命令行直接传入 DATABASE_URL', 'parity 工具仍可能接受明文 URL。');
includes('scripts/json-to-postgres-import.mjs', 'MIGRATION_CONFIRMATION', '导入执行器缺少确认词。');
includes('scripts/json-to-postgres-import.mjs', 'IMPORT_JSON_TO_STAGING_POSTGRES', '导入执行器确认词不正确。');
includes('scripts/json-to-postgres-import.mjs', '拒绝生产数据库目标。', '导入执行器未拒绝 production。');

rejects('node', ['scripts/postgres-parity-check.mjs', '--metadata-root', '.', '--database-url', 'postgresql://u:p@host/db'], 'parity 工具接受了明文数据库 URL。');
rejects('node', ['scripts/json-to-postgres-import.mjs', '--execute'], '导入执行器在缺少闸门时允许执行。');

includes('apps/api/src/database/prisma.service.ts', 'assertPrismaSchemaRoute', 'PrismaService must assert schema routing after connect.');
includes('apps/api/src/database/prisma.service.ts', 'createSchemaAwarePrismaPgAdapter', 'PrismaService must use schema-aware PrismaPg adapter.');
includes('apps/api/src/database/prisma-pg-schema.ts', '{ schema: route.schema }', 'PrismaPg helper must pass official schema option.');
includes('apps/api/src/database/prisma-pg-schema.ts', 'search_path', 'PrismaPg helper must configure pg search_path.');
includes('apps/api/src/database/prisma-pg-schema.ts', 'current_schema()', 'PrismaPg helper must assert current_schema.');
includes('apps/api/src/database/prisma-client-loader.ts', 'resolveApiRoot', 'Prisma client loader must resolve API root without trusting cwd.');
includes('apps/api/src/database/prisma-client-loader.ts', 'Generated Prisma client source is missing. Checked paths:', 'Prisma client loader missing-source error must list checked paths.');
includes('apps/api/src/database/prisma-client-loader.ts', 'node_modules/.cache', 'Prisma client loader must prefer API-root cache.');
includes('apps/api/src/database/prisma-client-loader.ts', 'tmpdir()', 'Prisma client loader must fall back to a system temp cache.');
includes('scripts/prisma-pg-schema-route.mjs', '{ schema: route.schema }', 'Import Runner PrismaPg helper must pass official schema option.');
includes('scripts/prisma-pg-schema-route.mjs', 'search_path', 'Import Runner PrismaPg helper must configure pg search_path.');
includes('scripts/prisma-pg-schema-route.mjs', 'current_schema()', 'Import Runner PrismaPg helper must assert current_schema.');
includes('apps/api/src/persistence/prisma/prisma-drawing.repository.ts', 'assertWriteAllowed', 'PrismaDrawingRepository writes must stay behind the PostgreSQL write gate.');
includes('apps/api/src/persistence/prisma/prisma-drawing.repository.ts', 'customer.findMany', 'PrismaDrawingRepository must read customers from PostgreSQL.');
includes('apps/api/src/persistence/prisma/prisma-drawing.repository.ts', 'productDocument', 'PrismaDrawingRepository must read and write product documents through PostgreSQL.');
includes('apps/api/src/persistence/prisma/prisma-drawing.repository.ts', 'pdfImportBatch', 'PrismaDrawingRepository must read and write PDF import batches through PostgreSQL.');
includes('apps/api/src/persistence/prisma/prisma-drawing.repository.ts', 'supportsSingleEffectiveVersion(document.moduleKey)', 'PrismaDrawingRepository must keep finished_images multi-effective behavior.');

if (failures.length) {
  console.error(failures.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log('PostgreSQL security gates check passed.');
