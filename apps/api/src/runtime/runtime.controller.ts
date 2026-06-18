import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DATA_SOURCE_CONFIG } from '../common/constants/repository-tokens';
import type { DataSourceConfig } from '../config/data-source.config';
import { StorageService } from '../storage/storage.service';

const startedAt = new Date();

@ApiTags('runtime')
@Controller('runtime')
export class RuntimeController {
  constructor(
    @Inject(DATA_SOURCE_CONFIG) private readonly dataSourceConfig: DataSourceConfig,
    private readonly storageService: StorageService,
  ) {}

  @Get('info')
  getRuntimeInfo() {
    const storage = this.storageService.getSafeStatus();
    return {
      service: 'hanglian-control-api',
      stage: process.env.DEPLOYMENT_STAGE ?? process.env.NODE_ENV ?? 'local',
      dataSource: this.dataSourceConfig.dataSource,
      storageProvider: storage.provider,
      persistentStorageExpected: storage.provider === 'local',
      storageConfigured: storage.configured,
      databaseConnected: false,
      version: process.env.npm_package_version ?? '0.0.1',
      startedAt: startedAt.toISOString(),
      uptimeSeconds: Math.floor((Date.now() - startedAt.getTime()) / 1000),
    };
  }
}
