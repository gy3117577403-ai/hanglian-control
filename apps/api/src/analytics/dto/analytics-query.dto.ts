import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export const analyticsRanges = ['today', 'week', 'month', 'all'] as const;
export const analyticsProcessSegments = ['front', 'back', 'common', 'all'] as const;

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ enum: analyticsRanges, default: 'today' })
  @IsOptional()
  @IsIn(analyticsRanges)
  range?: 'today' | 'week' | 'month' | 'all';

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  team?: string;

  @ApiPropertyOptional({ enum: analyticsProcessSegments, default: 'all' })
  @IsOptional()
  @IsIn(analyticsProcessSegments)
  processSegment?: 'front' | 'back' | 'common' | 'all';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;
}
