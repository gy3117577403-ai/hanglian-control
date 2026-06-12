import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { AuditAction, AuditEntityType } from '../../common/enums/production.enum';

export class AuditQueryDto {
  @ApiPropertyOptional({ enum: ['document', 'plan', 'feedback', 'file', 'system'] })
  @IsOptional()
  @IsIn(['document', 'plan', 'feedback', 'file', 'system'])
  entityType?: AuditEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({
    enum: [
      'document_uploaded',
      'document_status_changed',
      'document_version_changed',
      'document_set_effective',
      'document_archived',
      'document_previewed',
      'document_downloaded',
      'readiness_recalculated',
      'migration_preview_generated',
    ],
  })
  @IsOptional()
  @IsString()
  action?: AuditAction;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
