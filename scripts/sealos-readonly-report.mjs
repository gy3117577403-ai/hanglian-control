import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();

function exists(relativePath) {
  return existsSync(join(root, relativePath));
}

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function parseEnv(content) {
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    result[match[1]] = match[2].replace(/^['"]|['"]$/g, '').trim();
  }
  return result;
}

function isExampleDatabaseUrl(value = '') {
  const lower = value.toLowerCase();
  return !value
    || value === 'postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public'
    || lower.includes('user:password@host')
    || lower.includes('example');
}

function maskDatabaseUrl(value = '') {
  if (!value) return '未配置';
  if (isExampleDatabaseUrl(value)) return '示例连接串';
  try {
    const parsed = new URL(value);
    const user = parsed.username ? `${decodeURIComponent(parsed.username).slice(0, 2)}***` : '***';
    const port = parsed.port ? `:${parsed.port}` : '';
    const database = parsed.pathname.replace(/^\//, '') || 'database';
    const schema = parsed.searchParams.get('schema');
    return `${parsed.protocol}//${user}@${parsed.hostname}${port}/${database}${schema ? `?schema=${schema}` : ''}`;
  } catch {
    return '连接串格式无法解析';
  }
}

function git(args, fallback = '') {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return fallback;
  }
}

const envLocalPath = 'apps/api/.env.local';
const env = exists(envLocalPath) ? parseEnv(read(envLocalPath)) : {};
const databaseUrlState = isExampleDatabaseUrl(env.DATABASE_URL)
  ? '示例值，未连接'
  : '已配置真实测试库连接串，已脱敏显示';
const branch = git(['branch', '--show-current'], 'unknown');
const generatedAt = new Date().toISOString();

const checks = [
  ['当前分支', branch],
  ['阶段', 'V3.0A Sealos PostgreSQL 测试库只读验证准备'],
  ['.env.local', exists(envLocalPath) ? '已准备，本地忽略文件' : '未准备'],
  ['DATABASE_URL', databaseUrlState],
  ['DATABASE_URL 脱敏', maskDatabaseUrl(env.DATABASE_URL)],
  ['DB_TARGET', env.DB_TARGET ?? '未配置'],
  ['ALLOW_TEST_DB_CONNECT', env.ALLOW_TEST_DB_CONNECT ?? '未配置'],
  ['ALLOW_PRISMA_WRITE', env.ALLOW_PRISMA_WRITE ?? '未配置'],
  ['ALLOW_DESTRUCTIVE_DB_ACTIONS', env.ALLOW_DESTRUCTIVE_DB_ACTIONS ?? '未配置'],
  ['迁移 SQL 预览产物', exists('apps/api/storage/metadata/prisma-migration-preview.sql') ? '已生成，本地忽略' : '尚未生成或已清理'],
  ['seed dry-run 产物', exists('apps/api/storage/metadata/prisma-seed-preview.json') ? '已生成，本地忽略' : '尚未生成或已清理'],
  ['数据库写库操作', '未执行，V3.0A 禁止'],
  ['migrate / db push / db seed', '未执行，V3.0A 禁止'],
];

const lines = [
  '# V3.0A Sealos PostgreSQL 只读验证报告',
  '',
  `生成时间：${generatedAt}`,
  '',
  '## 安全结论',
  '',
  '- 本报告脚本不连接数据库。',
  '- 本报告不打印完整 DATABASE_URL。',
  '- 当前阶段只允许测试库只读连通验证和本地 dry-run / SQL preview。',
  '- 禁止 migrate、db push、db seed、prisma:seed:test-db 和任何写库操作。',
  '',
  '## 检查项',
  '',
  '| 项目 | 状态 |',
  '| --- | --- |',
  ...checks.map(([label, value]) => `| ${label} | ${String(value).replaceAll('|', '\\|')} |`),
  '',
  '## 本阶段命令',
  '',
  '```bash',
  'npm run db:readonly-check -w api',
  'npx prisma format --schema=apps/api/prisma/schema.prisma',
  'npx prisma validate --schema=apps/api/prisma/schema.prisma',
  'npx prisma generate --schema=apps/api/prisma/schema.prisma',
  'npm run migration:validate -w api',
  'npm run migration:preview -w api',
  'npm run prisma:seed:dry-run -w api',
  'npm run prisma:migration:sql-preview -w api',
  'npm run sealos:readonly-check',
  'npm run sealos:readonly-report',
  'npm run security:check',
  'npm run build',
  'npm run check',
  '```',
  '',
  '## 下一步',
  '',
  '如果真实测试库连接串已在本机 `.env.local` 配置且只读验证通过，可以进入 V3.0B 测试库建表准备；否则先由用户在本机文件中补充测试库连接串，不要把连接串发到聊天窗口。',
  '',
];

const output = 'docs/generated/sealos-readonly-report-v3.0a.md';
mkdirSync(dirname(join(root, output)), { recursive: true });
writeFileSync(join(root, output), `${lines.join('\n')}\n`, 'utf8');

console.log(`V3.0A Sealos readonly report generated: ${output}`);
