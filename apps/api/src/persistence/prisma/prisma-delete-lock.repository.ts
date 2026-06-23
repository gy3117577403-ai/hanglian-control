import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DatabaseConfigService } from '../../database/database-config.service';
import type { DeleteLockRepository, DeleteLockSetting } from '../persistence.types';

function defaultSetting(): DeleteLockSetting {
  return {
    enabled: true,
    failedAttempts: 0,
    lockedUntil: null,
  };
}

@Injectable()
export class PrismaDeleteLockRepository implements DeleteLockRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly databaseConfig: DatabaseConfigService,
  ) {}

  readSettings(): DeleteLockSetting {
    this.assertReadable();
    return defaultSetting();
  }

  writeSettings(_setting: DeleteLockSetting) {
    this.assertWritable();
  }

  updateFailedAttempts(failedAttempts: number, lockedUntil: string | null) {
    this.assertWritable();
    return { ...defaultSetting(), failedAttempts, lockedUntil };
  }

  updateLockedUntil(lockedUntil: string | null) {
    this.assertWritable();
    return { ...defaultSetting(), lockedUntil };
  }

  updatePasswordHash(passwordHash: string, updatedBy: string) {
    this.assertWritable();
    return {
      ...defaultSetting(),
      passwordHash,
      updatedBy,
      updatedAt: new Date().toISOString(),
    };
  }

  resetLockState() {
    this.assertWritable();
    return defaultSetting();
  }

  private assertReadable() {
    this.databaseConfig.assertCanStartPostgres();
    if (!this.prismaService.getSafeStatus().databaseConnected) {
      throw new ServiceUnavailableException('PostgreSQL 连接尚未就绪。');
    }
  }

  private assertWritable() {
    this.databaseConfig.assertWriteAllowed();
    this.assertReadable();
  }
}
