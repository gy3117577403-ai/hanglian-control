import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  assertDatabaseReadAllowed,
  assertDatabaseWriteAllowed,
  assertDestructiveDbActionAllowed,
  getDatabaseSafetyStatus,
  type DatabaseSafetyStatus,
  type RuntimeDataSource,
} from './database-safety';

@Injectable()
export class DatabaseConfigService {
  getStatus(): DatabaseSafetyStatus {
    return getDatabaseSafetyStatus();
  }

  get dataSource(): RuntimeDataSource {
    return this.getStatus().dataSource;
  }

  isMockMode() {
    return this.dataSource === 'mock';
  }

  isPostgresMode() {
    return this.dataSource === 'postgres';
  }

  assertCanStartPostgres() {
    try {
      assertDatabaseReadAllowed();
    } catch (error) {
      throw new ServiceUnavailableException(error instanceof Error ? error.message : 'PostgreSQL 安全闸门未满足。');
    }
  }

  assertWriteAllowed() {
    try {
      assertDatabaseWriteAllowed();
    } catch (error) {
      throw new ServiceUnavailableException(error instanceof Error ? error.message : 'PostgreSQL 写入闸门尚未开启。');
    }
  }

  assertDestructiveAllowed() {
    try {
      assertDestructiveDbActionAllowed();
    } catch (error) {
      throw new ServiceUnavailableException(error instanceof Error ? error.message : '破坏性数据库操作闸门保持关闭。');
    }
  }

  getSafeRuntimeSummary() {
    const status = this.getStatus();
    return {
      dataSource: status.dataSource,
      databaseTarget: status.dataSource === 'postgres' ? status.dbTarget : undefined,
      prismaWriteEnabled: status.dataSource === 'postgres' ? status.canWriteDatabase : undefined,
      databaseConnected: false,
      provider: status.safeSummary.provider,
      hostConfigured: status.safeSummary.hostConfigured,
    };
  }
}
