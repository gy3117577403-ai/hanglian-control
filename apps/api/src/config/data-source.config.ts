import { getDatabaseSafetyStatus } from '../database/database-safety';

export type DataSourceName = 'mock' | 'prisma';

export interface DataSourceConfig {
  dataSource: DataSourceName;
  databaseConfigured: boolean;
  databaseUrlMasked: string;
  databaseUrlLooksExample: boolean;
  databaseUrlLooksProduction: boolean;
  envLocalExists: boolean;
  dbTarget: string;
  allowTestDbConnect: boolean;
  allowPrismaWrite: boolean;
  allowDestructiveDbActions: boolean;
  prismaAvailable: boolean;
  canReadDatabase: boolean;
  canWriteDatabase: boolean;
  stage: string;
  message: string;
}

export function getDataSourceConfig(): DataSourceConfig {
  const safety = getDatabaseSafetyStatus();

  return {
    dataSource: safety.dataSource,
    databaseConfigured: safety.databaseConfigured,
    databaseUrlMasked: safety.databaseUrlMasked,
    databaseUrlLooksExample: safety.databaseUrlLooksExample,
    databaseUrlLooksProduction: safety.databaseUrlLooksProduction,
    envLocalExists: safety.envLocalExists,
    dbTarget: safety.dbTarget,
    allowTestDbConnect: safety.allowTestDbConnect,
    allowPrismaWrite: safety.allowPrismaWrite,
    allowDestructiveDbActions: safety.allowDestructiveDbActions,
    prismaAvailable: safety.prismaAvailable,
    canReadDatabase: safety.canReadDatabase,
    canWriteDatabase: safety.canWriteDatabase,
    stage: safety.stage,
    message: safety.dataSource === 'mock'
      ? '当前使用 Mock Repository，尚未连接 Sealos PostgreSQL。'
      : safety.message,
  };
}
