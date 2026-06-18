import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DATA_SOURCE_CONFIG } from '../common/constants/repository-tokens';
import type { DataSourceConfig } from '../config/data-source.config';
import { StorageService } from '../storage/storage.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(DATA_SOURCE_CONFIG) private readonly dataSourceConfig: DataSourceConfig,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  getHealth() {
    const storage = this.storageService.getSafeStatus();
    return {
      status: 'ok',
      service: '线束车间生产计划资料管控系统 API',
      version: '0.6.0',
      dataSource: this.dataSourceConfig.dataSource,
      storageProvider: storage.provider,
      storageConfigured: storage.provider === 'local' ? storage.localReady : storage.s3Configured,
    };
  }
}
