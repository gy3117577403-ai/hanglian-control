import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DATA_SOURCE_CONFIG } from '../common/constants/repository-tokens';
import type { DataSourceConfig } from '../config/data-source.config';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(DATA_SOURCE_CONFIG) private readonly dataSourceConfig: DataSourceConfig,
    private readonly storageService: StorageService,
    private readonly prismaService: PrismaService,
  ) {}

  @Get()
  getHealth() {
    const storage = this.storageService.getSafeStatus();
    const database = this.prismaService.getSafeStatus();
    return {
      status: 'ok',
      service: 'hanglian-control-api',
      version: process.env.npm_package_version ?? '0.0.1',
      dataSource: this.dataSourceConfig.dataSource,
      storageProvider: storage.provider,
      storageConfigured: storage.configured,
      ...(this.dataSourceConfig.dataSource === 'mock'
        ? { databaseConnected: false }
        : {
            databaseConnected: database.databaseConnected,
            databaseTarget: database.databaseTarget,
            prismaWriteEnabled: database.prismaWriteEnabled,
          }),
    };
  }
}
