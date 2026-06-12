import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MigrationService } from './migration.service';

@ApiTags('migration')
@Controller('migration')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Get('preview')
  @ApiOperation({ summary: '生成本地 Mock 到 Prisma PostgreSQL 的迁移预览统计，不连接数据库' })
  getPreview() {
    return this.migrationService.getPreview();
  }

  @Get('validate')
  @ApiOperation({ summary: '校验 Mock/metadata 迁移数据完整性，不连接数据库，不写入数据库' })
  validate() {
    return this.migrationService.validate();
  }

  @Get('prisma-seed-preview')
  @ApiOperation({ summary: '生成 Prisma seed dry-run JSON 结构预览，不执行 seed' })
  getPrismaSeedPreview() {
    return this.migrationService.getPrismaSeedPreview();
  }

  @Get('export-seed')
  @ApiOperation({ summary: '导出后续 Prisma seed 可用的 JSON 结构，不写入数据库' })
  exportSeed() {
    return this.migrationService.exportSeed();
  }
}
