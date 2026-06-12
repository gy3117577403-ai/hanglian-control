import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const apiRoot = resolve(__dirname, '../..');
const metadataDir = join(apiRoot, 'storage', 'metadata');
const outputFile = join(metadataDir, 'prisma-migration-preview.sql');

mkdirSync(metadataDir, { recursive: true });

try {
  const sql = execSync('npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script', {
    cwd: apiRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public',
    },
  });

  writeFileSync(outputFile, sql, 'utf8');
  console.log(JSON.stringify({
    success: true,
    file: outputFile,
    message: '该 SQL 仅为预览，尚未执行到数据库。',
    executed: false,
    connectedDatabase: false,
  }, null, 2));
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : '生成迁移 SQL 预览失败。');
  process.exitCode = 1;
}
