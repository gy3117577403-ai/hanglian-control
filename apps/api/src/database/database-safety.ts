import { hasApiEnvLocal } from './env-loader';

export type DatabaseSafetyStage = 'V3.18A_POSTGRES_FOUNDATION';
export type RuntimeDataSource = 'mock' | 'postgres';

export interface DatabaseSafetyStatus {
  stage: DatabaseSafetyStage;
  dataSource: RuntimeDataSource;
  dbTarget: string;
  databaseConfigured: boolean;
  databaseUrlMasked: string;
  databaseUrlLooksExample: boolean;
  databaseUrlLooksProduction: boolean;
  envLocalExists: boolean;
  allowTestDbConnect: boolean;
  allowPrismaWrite: boolean;
  allowDestructiveDbActions: boolean;
  runPrismaMigrateDeploy: boolean;
  postgresAvailable: boolean;
  prismaAvailable: boolean;
  canReadDatabase: boolean;
  canWriteDatabase: boolean;
  destructiveActionsAllowed: boolean;
  dryRun: boolean;
  warnings: string[];
  nextSteps: string[];
  message: string;
  safeSummary: {
    provider: 'postgresql';
    target: string;
    hostConfigured: boolean;
    writeEnabled: boolean;
  };
}

const EXAMPLE_DATABASE_URL = 'postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public';
const PRODUCTION_KEYWORDS = ['prod', 'production', 'formal', 'official', 'release', 'shengchan', 'zhengshi'];

function boolEnv(name: string) {
  return process.env[name]?.toLowerCase() === 'true';
}

export function dataSource(): RuntimeDataSource {
  const source = process.env.DATA_SOURCE?.trim().toLowerCase();
  if (!source || source === 'mock') return 'mock';
  if (source === 'postgres') return 'postgres';
  throw new Error('不支持的数据源配置。');
}

function dbTarget() {
  return process.env.DB_TARGET?.toLowerCase() ?? 'local';
}

function databaseUrl() {
  return process.env.DATABASE_URL?.trim() ?? '';
}

export function maskDatabaseUrl(url = databaseUrl()) {
  if (!url) return 'not-configured';
  if (isExampleDatabaseUrl(url)) return 'example-database-url';
  try {
    const parsed = new URL(url);
    const port = parsed.port ? ':***' : '';
    return `${parsed.protocol}//***@configured-host${port}/configured-database`;
  } catch {
    return 'invalid-database-url';
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
  return PRODUCTION_KEYWORDS.some((keyword) => value.includes(keyword));
}

export function isDatabaseConfigured() {
  return Boolean(databaseUrl()) && !isExampleDatabaseUrl();
}

export function canConnectDatabase() {
  const status = getDatabaseSafetyStatus();
  return status.canReadDatabase;
}

export function assertReadOnlyDatabaseCheckAllowed() {
  assertDatabaseReadAllowed();
}

export function assertDatabaseReadAllowed() {
  const status = getDatabaseSafetyStatus();
  if (status.dataSource !== 'postgres') {
    throw new Error('DATA_SOURCE=mock；业务 API 不会连接 PostgreSQL。');
  }
  if (!status.canReadDatabase) {
    throw new Error(status.message);
  }
}

export function assertDatabaseWriteAllowed() {
  const status = getDatabaseSafetyStatus();
  if (!status.canWriteDatabase) {
    throw new Error('PostgreSQL 写入闸门尚未开启。');
  }
}

export function assertNotProductionDatabase() {
  const status = getDatabaseSafetyStatus();
  if (status.databaseUrlLooksProduction || status.dbTarget !== 'staging') {
    throw new Error('当前数据库目标不是隔离 staging，操作已阻止。');
  }
  if (!status.canWriteDatabase) {
    throw new Error('PostgreSQL 写入闸门尚未开启。');
  }
}

export function assertDestructiveDbActionAllowed() {
  const status = getDatabaseSafetyStatus();
  if (!status.destructiveActionsAllowed) {
    throw new Error('破坏性数据库操作闸门保持关闭。');
  }
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
  const runMigrateDeploy = boolEnv('RUN_PRISMA_MIGRATE_DEPLOY');
  const targetReady = target === 'staging';
  const canReadDatabase = source === 'postgres'
    && configured
    && targetReady
    && allowConnect
    && !looksProduction
    && !runMigrateDeploy;
  const canWriteDatabase = canReadDatabase && allowWrite;
  const warnings: string[] = [];

  if (!hasApiEnvLocal() && process.env.NODE_ENV !== 'production') {
    warnings.push('apps/api/.env.local 未找到；本地测试仍保持 mock 模式。');
  }
  if (source === 'mock') {
    warnings.push('DATA_SOURCE=mock；业务 API 使用 JSON Repository。');
  }
  if (source === 'postgres' && !configured) {
    warnings.push('DATABASE_URL 缺失或仍是示例值。');
  }
  if (source === 'postgres' && !targetReady) {
    warnings.push(`DB_TARGET=${target}；PostgreSQL 模式只允许 DB_TARGET=staging。`);
  }
  if (source === 'postgres' && !allowConnect) {
    warnings.push('ALLOW_TEST_DB_CONNECT 未开启；PostgreSQL 连接被禁止。');
  }
  if (source === 'postgres' && runMigrateDeploy) {
    warnings.push('RUN_PRISMA_MIGRATE_DEPLOY 必须保持 false；应用启动不会执行 migration。');
  }
  if (looksProduction) {
    warnings.push('DATABASE_URL 疑似生产连接串，已阻止。');
  }
  if (!allowWrite) {
    warnings.push('ALLOW_PRISMA_WRITE=false；数据库写入被禁止。');
  }
  if (!allowDestructive) {
    warnings.push('ALLOW_DESTRUCTIVE_DB_ACTIONS=false；破坏性操作被禁止。');
  }

  const message = source === 'mock'
    ? '当前使用 JSON Repository；未连接 PostgreSQL。'
    : canReadDatabase
      ? 'PostgreSQL staging 只读连接闸门已满足；写入仍受 ALLOW_PRISMA_WRITE 控制。'
      : 'PostgreSQL 安全闸门未满足，API 拒绝启动连接。';

  return {
    stage: 'V3.18A_POSTGRES_FOUNDATION',
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
    runPrismaMigrateDeploy: runMigrateDeploy,
    postgresAvailable: canReadDatabase,
    prismaAvailable: canReadDatabase,
    canReadDatabase,
    canWriteDatabase,
    destructiveActionsAllowed: canWriteDatabase && allowDestructive,
    dryRun: !canWriteDatabase,
    warnings,
    nextSteps: [
      '创建隔离 Sealos PostgreSQL staging 数据库。',
      '先运行只读连通验证，再生成 create-only migration。',
      '使用 JSON dry-run 和 parity check 决定是否切换 DATA_SOURCE=postgres。',
    ],
    message,
    safeSummary: {
      provider: 'postgresql',
      target,
      hostConfigured: configured,
      writeEnabled: canWriteDatabase,
    },
  };
}
