import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DatabaseConfigService } from '../../database/database-config.service';
import type { DeleteLockRepository, DeleteLockSetting } from '../persistence.types';

const singletonId = 'document-delete-lock';

function defaultSetting(): DeleteLockSetting {
  return {
    enabled: true,
    failedAttempts: 0,
    lockedUntil: null,
  };
}

function iso(value?: Date | string | null) {
  return value ? new Date(value).toISOString() : null;
}

function mapSetting(row: Record<string, any> | null | undefined): DeleteLockSetting {
  if (!row) return defaultSetting();
  return {
    enabled: row.enabled,
    passwordHash: row.passwordHash,
    failedAttempts: row.failedAttempts,
    lockedUntil: iso(row.lockedUntil),
    updatedAt: iso(row.updatedAt) ?? undefined,
    updatedBy: row.updatedBy ?? undefined,
  };
}

@Injectable()
export class PrismaDeleteLockRepository implements DeleteLockRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly databaseConfig: DatabaseConfigService,
  ) {}

  async readSettings(): Promise<DeleteLockSetting> {
    this.assertReadable();
    const row = await this.prismaService.client.deleteLockSetting.findUnique({
      where: { id: singletonId },
    });
    return mapSetting(row);
  }

  async writeSettings(setting: DeleteLockSetting): Promise<void> {
    this.assertWritable();
    await this.prismaService.client.deleteLockSetting.upsert({
      where: { id: singletonId },
      create: this.toData(setting),
      update: this.toData(setting),
    });
  }

  async updateFailedAttempts(failedAttempts: number, lockedUntil: string | null) {
    const current = await this.readSettings();
    const next = { ...current, failedAttempts, lockedUntil };
    await this.writeSettings(next);
    return next;
  }

  async updateLockedUntil(lockedUntil: string | null) {
    const current = await this.readSettings();
    const next = { ...current, lockedUntil };
    await this.writeSettings(next);
    return next;
  }

  async updatePasswordHash(passwordHash: string, updatedBy: string) {
    const next = {
      ...defaultSetting(),
      passwordHash,
      updatedBy,
      updatedAt: new Date().toISOString(),
    };
    await this.writeSettings(next);
    return next;
  }

  async resetLockState() {
    const current = await this.readSettings();
    const next = { ...current, failedAttempts: 0, lockedUntil: null };
    await this.writeSettings(next);
    return next;
  }

  private toData(setting: DeleteLockSetting) {
    return {
      id: singletonId,
      enabled: setting.enabled,
      passwordHash: setting.passwordHash ?? '',
      failedAttempts: setting.failedAttempts,
      lockedUntil: setting.lockedUntil ? new Date(setting.lockedUntil) : null,
      updatedBy: setting.updatedBy,
    };
  }

  private assertReadable() {
    this.databaseConfig.assertCanStartPostgres();
    if (!this.prismaService.getSafeStatus().databaseConnected) {
      throw new ServiceUnavailableException('PostgreSQL connection is not ready.');
    }
  }

  private assertWritable() {
    this.databaseConfig.assertWriteAllowed();
    this.assertReadable();
  }
}
