import { getDatabaseSafetyStatus, type RuntimeDataSource } from '../database/database-safety';

export type DataSourceName = RuntimeDataSource;

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
  runPrismaMigrateDeploy: boolean;
  postgresAvailable: boolean;
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
    runPrismaMigrateDeploy: safety.runPrismaMigrateDeploy,
    postgresAvailable: safety.postgresAvailable,
    prismaAvailable: safety.prismaAvailable,
    canReadDatabase: safety.canReadDatabase,
    canWriteDatabase: safety.canWriteDatabase,
    stage: safety.stage,
    message: safety.message,
  };
}
