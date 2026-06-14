import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ResumePlanDto {
  @ApiPropertyOptional({ example: '异常已处理，恢复生产' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ example: 'mock-front-leader' })
  @IsOptional()
  @IsString()
  operatorId?: string;

  @ApiPropertyOptional({ example: '前段组长演示' })
  @IsOptional()
  @IsString()
  operatorName?: string;

  @ApiPropertyOptional({ example: '前段组长' })
  @IsOptional()
  @IsString()
  operatorRole?: string;
}
