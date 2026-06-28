import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class MaintenanceQueryDto {
  @ApiPropertyOptional({ description: '关键词' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '状态' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '销售' })
  @IsOptional()
  @IsString()
  sales?: string;

  @ApiPropertyOptional({ description: '客户 ID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: '产品 ID' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ enum: ['today', 'week', 'all'] })
  @IsOptional()
  @IsIn(['today', 'week', 'all'])
  scope?: 'today' | 'week' | 'all';

  @ApiPropertyOptional({ description: '工序段' })
  @IsOptional()
  @IsString()
  processSegment?: string;

  @ApiPropertyOptional({ description: '确认状态' })
  @IsOptional()
  @IsString()
  confirmStatus?: string;

  @ApiPropertyOptional({ description: '资料类型' })
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiPropertyOptional({ description: '资料来源' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: '适用工序' })
  @IsOptional()
  @IsString()
  requiredForProcess?: string;

  @ApiPropertyOptional({ description: '对象类型' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: '对象 ID' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: '操作人 ID' })
  @IsOptional()
  @IsString()
  operatorId?: string;

  @ApiPropertyOptional({ description: '限制条数' })
  @IsOptional()
  @IsString()
  limit?: string;
}
