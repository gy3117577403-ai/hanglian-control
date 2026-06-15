import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsIn, IsOptional, IsString } from 'class-validator';

export const unifiedDocumentTypes = [
  'all',
  'drawing',
  'sop',
  'pin_map',
  'finished_image',
  'connector',
  'front_parameter',
  'back_package',
  'fixture',
  'abnormal_case',
  'quality_standard',
  'other',
] as const;

export class UnifiedSearchDto {
  @ApiPropertyOptional({ description: '关键词，支持客户、产品、资料标题、文件名、版本、质量/异常/治具字段' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: unifiedDocumentTypes, description: '统一资料类型筛选' })
  @IsOptional()
  @IsIn(unifiedDocumentTypes)
  type?: typeof unifiedDocumentTypes[number];

  @ApiPropertyOptional({ description: '客户名称' })
  @IsOptional()
  @IsString()
  customer?: string;

  @ApiPropertyOptional({ description: '产品编号' })
  @IsOptional()
  @IsString()
  productCode?: string;

  @ApiPropertyOptional({ description: '状态' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '资料来源' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: '是否包含回收站资料', example: 'false' })
  @IsOptional()
  @IsBooleanString()
  includeDeleted?: string;
}
