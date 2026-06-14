import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class RegressionQueryDto {
  @ApiPropertyOptional({ description: '回归范围', enum: ['all', 'core', 'demo'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'core', 'demo'])
  scope?: 'all' | 'core' | 'demo' = 'all';
}
