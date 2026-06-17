import { hasApiEnvLocal } from './env-loader';

export type DatabaseSafetyStage = 'V3.0A_SEALOS_READONLY_CHECK' | 'V3.6_SEALOS_CLOUD_TEST';

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
const PRODUCTION_KEYWORDS = ['prod', 'production', 'formal', 'official', 'release', 'shengchan', 'zhengshi'];

function boolEnv(name: string) {
  return process.env[name]?.toLowerCase() === 'true';
}

function dataSource() {
  return process.env.DATA_SOURCE?.toLowerCase() === 'prisma' ? 'prisma' : 'mock';
}

function dbTarget() {
  return process.env.DB_TARGET?.toLowerCase() ?? 'local';
}

function deploymentStage() {
  return process.env.DEPLOYMENT_STAGE?.toLowerCase() ?? 'readonly';
}

function databaseUrl() {
  return process.env.DATABASE_URL?.trim() ?? '';
}

function hostLabel(hostname: string) {
  return hostname || 'host';
}

export function maskDatabaseUrl(url = databaseUrl()) {
  if (!url) return 'not-configured';
  if (isExampleDatabaseUrl(url)) return 'example-database-url';

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
  return PRODUCTION_KEYWORDS.some((keyword) => value.includes(keyword.toLowerCase()));
}

export function isDatabaseConfigured() {
  return Boolean(databaseUrl()) && !isExampleDatabaseUrl();
}

export function isSealosCloudTestMode() {
  return deploymentStage() === 'sealos-test'
    && dataSource() === 'prisma'
    && isDatabaseConfigured()
    && dbTarget() === 'test'
    && boolEnv('ALLOW_TEST_DB_CONNECT')
    && boolEnv('ALLOW_PRISMA_WRITE')
    && !boolEnv('ALLOW_DESTRUCTIVE_DB_ACTIONS')
    && !isSuspiciousProductionUrl();
}

export function canConnectTestDatabaseReadOnly() {
  return isDatabaseConfigured()
    && dbTarget() === 'test'
    && boolEnv('ALLOW_TEST_DB_CONNECT')
    && !boolEnv('ALLOW_PRISMA_WRITE')
    && !boolEnv('ALLOW_DESTRUCTIVE_DB_ACTIONS')
    && !isSuspiciousProductionUrl();
}

export function canConnectDatabase() {
  return canConnectTestDatabaseReadOnly() || isSealosCloudTestMode();
}

export function assertReadOnlyDatabaseCheckAllowed() {
  const status = getDatabaseSafetyStatus();
  if (!status.canReadDatabase) {
    throw new Error(status.message);
  }
}

export function assertDatabaseReadAllowed() {
  if (dataSource() !== 'prisma') {
    throw new Error('DATA_SOURCE=mock; business APIs will not connect to PostgreSQL.');
  }
  const status = getDatabaseSafetyStatus();
  if (!status.canReadDatabase) {
    throw new Error(status.message);
  }
}

export function assertDatabaseWriteAllowed() {
  const status = getDatabaseSafetyStatus();
  if (!status.canWriteDatabase) {
    throw new Error('Database writes are disabled. Use DEPLOYMENT_STAGE=sealos-test with DB_TARGET=test and destructive actions disabled.');
  }
}

export function assertNotProductionDatabase() {
  const status = getDatabaseSafetyStatus();
  if (status.databaseUrlLooksProduction || status.dbTarget !== 'test') {
    throw new Error('The configured database is not an explicit test database. Operation blocked.');
  }
  if (!status.canWriteDatabase) {
    throw new Error('Test database write access is not enabled.');
  }
}

export function assertDestructiveDbActionAllowed() {
  throw new Error('Destructive database actions are always blocked in Sealos test deployment.');
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
  const cloudTestMode = isSealosCloudTestMode();
  const canReadDatabase = canConnectDatabase();
  const canWriteDatabase = cloudTestMode;
  const warnings: string[] = [];

  if (!hasApiEnvLocal() && process.env.NODE_ENV !== 'production') {
    warnings.push('apps/api/.env.local was not found for local testing.');
  }
  if (source === 'mock') {
    warnings.push('DATA_SOURCE=mock; business APIs are still using mock repositories.');
  }
  if (looksExample) {
    warnings.push('DATABASE_URL is missing or still an example value.');
  }
  if (looksProduction) {
    warnings.push(`DATABASE_URL looks like a production connection string and is blocked: ${maskDatabaseUrl()}`);
  }
  if (target !== 'test') {
    warnings.push(`DB_TARGET=${target}; only DB_TARGET=test is allowed for this deployment stage.`);
  }
  if (!allowConnect) {
    warnings.push('ALLOW_TEST_DB_CONNECT=false; PostgreSQL connection is disabled.');
  }
  if (allowWrite && !cloudTestMode) {
    warnings.push('ALLOW_PRISMA_WRITE=true but DEPLOYMENT_STAGE is not sealos-test; writes remain blocked.');
  }
  if (!allowWrite) {
    warnings.push('ALLOW_PRISMA_WRITE=false; database writes are disabled.');
  }
  if (allowDestructive) {
    warnings.push('ALLOW_DESTRUCTIVE_DB_ACTIONS=true is not allowed and destructive actions remain blocked.');
  }
  if (!allowDestructive) {
    warnings.push('Destructive database actions are disabled.');
  }

  return {
    stage: cloudTestMode ? 'V3.6_SEALOS_CLOUD_TEST' : 'V3.0A_SEALOS_READONLY_CHECK',
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
    canWriteDatabase,
    destructiveActionsAllowed: false,
    dryRun: !canWriteDatabase,
    warnings,
    nextSteps: cloudTestMode
      ? [
          'Run prisma migrate deploy against the isolated Sealos test database.',
          'Deploy the API with DATA_SOURCE=prisma.',
          'Point the tablet PWA runtime config to the cloud API.',
        ]
      : [
          'Configure an isolated Sealos PostgreSQL test database.',
          'Run readonly connection validation.',
          'Enable DEPLOYMENT_STAGE=sealos-test only after confirming the target database is isolated.',
        ],
    message: cloudTestMode
      ? 'Sealos test database mode is enabled. Non-destructive Prisma reads and writes are allowed.'
      : canConnectTestDatabaseReadOnly()
        ? 'Readonly Sealos PostgreSQL test connection checks are allowed. Writes are still disabled.'
        : 'Real PostgreSQL access is not enabled.',
  };
}
