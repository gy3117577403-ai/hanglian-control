import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DATA_SOURCE_CONFIG } from '../common/constants/repository-tokens';
import type { DataSourceConfig } from '../config/data-source.config';
import { getDatabaseSafetyStatus } from '../database/database-safety';

@ApiTags('system')
@Controller('system')
export class SystemController {
  constructor(
    @Inject(DATA_SOURCE_CONFIG)
    private readonly dataSourceConfig: DataSourceConfig,
  ) {}

  @Get('data-source')
  @ApiOperation({ summary: '查看当前数据源与 Prisma 接入准备状态' })
  getDataSourceStatus() {
    return {
      dataSource: this.dataSourceConfig.dataSource,
      databaseConfigured: this.dataSourceConfig.databaseConfigured,
      databaseUrlMasked: this.dataSourceConfig.databaseUrlMasked,
      databaseUrlLooksExample: this.dataSourceConfig.databaseUrlLooksExample,
      databaseUrlLooksProduction: this.dataSourceConfig.databaseUrlLooksProduction,
      envLocalExists: this.dataSourceConfig.envLocalExists,
      dbTarget: this.dataSourceConfig.dbTarget,
      allowTestDbConnect: this.dataSourceConfig.allowTestDbConnect,
      allowPrismaWrite: this.dataSourceConfig.allowPrismaWrite,
      allowDestructiveDbActions: this.dataSourceConfig.allowDestructiveDbActions,
      prismaAvailable: this.dataSourceConfig.prismaAvailable,
      canReadDatabase: this.dataSourceConfig.canReadDatabase,
      canWriteDatabase: this.dataSourceConfig.canWriteDatabase,
      authMode: 'mock',
      authProvider: 'local_mock',
      wecomLoginEnabled: false,
      stage: this.dataSourceConfig.stage,
      message: this.dataSourceConfig.message,
    };
  }

  @Get('ping')
  @ApiOperation({ summary: '轻量 API 延迟检测，不连接数据库。' })
  ping() {
    return {
      ok: true,
      timestamp: new Date().toISOString(),
      service: '线束车间生产计划资料管控系统 API',
    };
  }

  @Get('database-safety')
  @ApiOperation({ summary: '查看数据库安全闸门状态，V0.8A 仅允许测试库只读检查' })
  getDatabaseSafety() {
    return {
      ...getDatabaseSafetyStatus(),
      authMode: 'mock',
      authProvider: 'local_mock',
      wecomLoginEnabled: false,
    };
  }
}
