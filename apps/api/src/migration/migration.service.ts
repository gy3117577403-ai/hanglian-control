import { Inject, Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { REPOSITORY_TOKENS } from '../common/constants/repository-tokens';
import type { MigrationRepositoryInterface } from '../repositories/interfaces/migration.repository.interface';
import { buildPrismaSeedPreview, validateMigrationData } from './migration-dry-run';

@Injectable()
export class MigrationService {
  constructor(
    @Inject(REPOSITORY_TOKENS.migration)
    private readonly migrationRepository: MigrationRepositoryInterface,
    private readonly auditService: AuditService,
  ) {}

  async getPreview() {
    const preview = await this.migrationRepository.getPreview();
    await this.auditService.tryCreate({
      entityType: 'system',
      entityId: 'migration-preview',
      action: 'migration_preview_generated',
      after: preview.summary,
      message: '生成 Prisma/Sealos 迁移预览，未连接数据库。',
      operatorId: 'demo-leader',
      operatorName: '组长演示账号',
      operatorRole: '组长',
    });
    return preview;
  }

  async exportSeed() {
    return this.migrationRepository.exportSeed();
  }

  validate() {
    return validateMigrationData();
  }

  getPrismaSeedPreview() {
    return buildPrismaSeedPreview();
  }
}
