import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class ExecutionQueryDto {
  @ApiPropertyOptional({ enum: ['today', 'week', 'all'], example: 'today' })
  @IsOptional()
  @IsIn(['today', 'week', 'all'])
  scope?: 'today' | 'week' | 'all';

  @ApiPropertyOptional({ example: 'running' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'front' })
  @IsOptional()
  @IsString()
  processSegment?: string;

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
  leaderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string;
}
