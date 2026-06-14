import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class FixtureQueryDto {
  @ApiPropertyOptional({ description: '关键字' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '客户 ID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: '产品 ID' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ enum: ['front', 'back', 'common'] })
  @IsOptional()
  @IsIn(['front', 'back', 'common'])
  processSegment?: 'front' | 'back' | 'common';

  @ApiPropertyOptional({ enum: ['active', 'pending_review', 'inactive', 'abnormal'] })
  @IsOptional()
  @IsIn(['active', 'pending_review', 'inactive', 'abnormal'])
  status?: 'active' | 'pending_review' | 'inactive' | 'abnormal';

  @ApiPropertyOptional({ description: '限制条数' })
  @IsOptional()
  @IsString()
  limit?: string;
}

