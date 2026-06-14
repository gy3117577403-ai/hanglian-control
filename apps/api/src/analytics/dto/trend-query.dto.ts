import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { AnalyticsQueryDto } from './analytics-query.dto';

export class TrendQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({ enum: ['daily', 'weekly'], default: 'daily' })
  @IsOptional()
  @IsIn(['daily', 'weekly'])
  granularity?: 'daily' | 'weekly';
}
