import { hasApiEnvLocal } from './env-loader';

export type DatabaseSafetyStage = 'V3.0A_SEALOS_READONLY_CHECK';

export interface DatabaseSafetyStatus {
  stage: DatabaseSafetyStage;
  dataSource: 'mock' | 'prisma';
  dbTarget: string;
  databaseConfigured: boolean;
  databaseUrlMasked: string;
  databaseUrlLooksExample: boolean;
  databaseUrlLooksProduction: boolean;
  envLocalExists: boolean;
  allowTestDbConnect: boolean;
  allowPrismaWrite: boolean;
  allowDestructiveDbActions: boolean;
  prismaAvailable: boolean;
  canReadDatabase: boolean;
  canWriteDatabase: boolean;
  destructiveActionsAllowed: boolean;
  dryRun: boolean;
  warnings: string[];
  nextSteps: string[];
  message: string;
}

const EXAMPLE_DATABASE_URL = 'postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public';
const PRODUCTION_KEYWORDS = ['prod', 'production', '生产', '正式'];

function boolEnv(name: string) {
  return process.env[name]?.toLowerCase() === 'true';
}

function dataSource() {
  return process.env.DATA_SOURCE?.toLowerCase() === 'prisma' ? 'prisma' : 'mock';
}

function dbTarget() {
  return process.env.DB_TARGET?.toLowerCase() ?? 'local';
}

function databaseUrl() {
  return process.env.DATABASE_URL?.trim() ?? '';
}

function hostLabel(hostname: string) {
  if (!hostname) return 'host';
  return hostname;
}

export function maskDatabaseUrl(url = databaseUrl()) {
  if (!url) return '未配置';
  if (isExampleDatabaseUrl(url)) return '示例连接串';

  try {
    const parsed = new URL(url);
    const username = decodeURIComponent(parsed.username || '');
    const maskedUser = username ? `${username.slice(0, 2)}***` : '***';
    const database = parsed.pathname.replace(/^\//, '') || 'database';
    const schema = parsed.searchParams.get('schema');
    const schemaSuffix = schema ? `?schema=${schema}` : '';
    const port = parsed.port ? `:${parsed.port}` : '';
    return `${parsed.protocol}//${maskedUser}@${hostLabel(parsed.hostname)}${port}/${database}${schemaSuffix}`;
  } catch {
    return '连接串格式无法解析';
  }
}

export function isExampleDatabaseUrl(url = databaseUrl()) {
  const value = url.trim();
  return !value
    || value === EXAMPLE_DATABASE_URL
    || value.includes('USER:PASSWORD@HOST')
    || value.toLowerCase().includes('example');
}

export function isSuspiciousProductionUrl(url = databaseUrl()) {
  if (!url) return false;
  const value = decodeURIComponent(url).toLowerCase();
  return PRODUCTION_KEYWORDS.some((keyword) => value.includes(keyword.toLowerCase()));
}

export function isDatabaseConfigured() {
  return Boolean(databaseUrl()) && !isExampleDatabaseUrl();
}

export function canConnectTestDatabaseReadOnly() {
  return isDatabaseConfigured()
    && dbTarget() === 'test'
    && boolEnv('ALLOW_TEST_DB_CONNECT')
    && !boolEnv('ALLOW_PRISMA_WRITE')
    && !boolEnv('ALLOW_DESTRUCTIVE_DB_ACTIONS')
    && !isSuspiciousProductionUrl();
}

export function assertReadOnlyDatabaseCheckAllowed() {
  const status = getDatabaseSafetyStatus();
  if (!status.canReadDatabase) {
    throw new Error(status.message);
  }
}

export function assertDatabaseReadAllowed() {
  if (dataSource() !== 'prisma') {
    throw new Error('当前 DATA_SOURCE=mock，业务 API 不会连接数据库。');
  }
  assertReadOnlyDatabaseCheckAllowed();
}

export function assertDatabaseWriteAllowed() {
  const status = getDatabaseSafetyStatus();
  if (!status.canWriteDatabase) {
    throw new Error('V3.0A 阶段禁止任何数据库写入。请保持 ALLOW_PRISMA_WRITE=false。');
  }
}

export function assertNotProductionDatabase() {
  const status = getDatabaseSafetyStatus();
  if (status.databaseUrlLooksProduction || status.dbTarget !== 'test') {
    throw new Error('当前数据库目标不是明确的测试库，已阻止数据库操作。');
  }
  if (!status.canWriteDatabase) {
    throw new Error('V3.0A 阶段禁止测试库写入入口，只允许只读连接验证。');
  }
}

export function assertDestructiveDbActionAllowed() {
  throw new Error('V3.0A 阶段禁止清库、删库、重置、truncate、drop 等危险操作。');
}

export function getDatabaseSafetyStatus(): DatabaseSafetyStatus {
  const source = dataSource();
  const target = dbTarget();
  const configured = isDatabaseConfigured();
  const looksExample = isExampleDatabaseUrl();
  const looksProduction = isSuspiciousProductionUrl();
  const allowConnect = boolEnv('ALLOW_TEST_DB_CONNECT');
  const allowWrite = boolEnv('ALLOW_PRISMA_WRITE');
  const allowDestructive = boolEnv('ALLOW_DESTRUCTIVE_DB_ACTIONS');
  const canReadDatabase = canConnectTestDatabaseReadOnly();
  const warnings: string[] = [];

  if (!hasApiEnvLocal()) {
    warnings.push('未检测到 apps/api/.env.local；如需真实测试库只读验证，请复制 .env.local.example 后在本机填写。');
  }
  if (source === 'mock') {
    warnings.push('当前前端数据仍来自 Mock API，尚未切换到 Sealos。');
  }
  if (looksExample) {
    warnings.push('DATABASE_URL 未配置或仍为示例值。');
  }
  if (looksProduction) {
    warnings.push(`DATABASE_URL 疑似生产库连接串，已阻止连接：${maskDatabaseUrl()}`);
  }
  if (target !== 'test') {
    warnings.push(`DB_TARGET=${target}；V3.0A 只允许 DB_TARGET=test 时做只读验证。`);
  }
  if (!allowConnect) {
    warnings.push('ALLOW_TEST_DB_CONNECT=false；测试库只读连接已禁用。');
  }
  if (allowWrite) {
    warnings.push('ALLOW_PRISMA_WRITE=true；V3.0A 必须保持 false，任何写库操作都会被拒绝。');
  }
  if (allowDestructive) {
    warnings.push('ALLOW_DESTRUCTIVE_DB_ACTIONS=true；V3.0A 必须保持 false，危险操作已被拒绝。');
  }
  if (!allowWrite) {
    warnings.push('ALLOW_PRISMA_WRITE=false；数据库写入已禁用。');
  }
  if (!allowDestructive) {
    warnings.push('危险数据库操作已禁用。');
  }

  return {
    stage: 'V3.0A_SEALOS_READONLY_CHECK',
    dataSource: source,
    dbTarget: target,
    databaseConfigured: configured,
    databaseUrlMasked: maskDatabaseUrl(),
    databaseUrlLooksExample: looksExample,
    databaseUrlLooksProduction: looksProduction,
    envLocalExists: hasApiEnvLocal(),
    allowTestDbConnect: allowConnect,
    allowPrismaWrite: allowWrite,
    allowDestructiveDbActions: allowDestructive,
    prismaAvailable: source === 'prisma' && canReadDatabase,
    canReadDatabase,
    canWriteDatabase: false,
    destructiveActionsAllowed: false,
    dryRun: true,
    warnings,
    nextSteps: [
      '执行只读连接验证',
      '生成迁移 SQL 预览',
      '生成 seed dry-run',
      '确认无误后进入 V3.0B 测试库建表',
    ],
    message: canReadDatabase
      ? '允许执行 Sealos PostgreSQL 测试库只读连通检查；仍禁止写库。'
      : looksExample
        ? '当前未配置真实测试库连接串；只读连接验证将安全退出。'
        : '当前不会连接真实数据库；只读检查条件尚未满足。',
  };
}
