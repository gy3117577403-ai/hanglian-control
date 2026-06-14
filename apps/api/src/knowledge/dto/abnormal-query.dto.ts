import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class AbnormalQueryDto {
  @ApiPropertyOptional({ description: '关键字' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ enum: ['front', 'back', 'common'] })
  @IsOptional()
  @IsIn(['front', 'back', 'common'])
  processSegment?: 'front' | 'back' | 'common';

  @ApiPropertyOptional({ enum: ['active', 'pending_review', 'closed'] })
  @IsOptional()
  @IsIn(['active', 'pending_review', 'closed'])
  status?: 'active' | 'pending_review' | 'closed';

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'critical'] })
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  severity?: 'low' | 'medium' | 'high' | 'critical';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}

