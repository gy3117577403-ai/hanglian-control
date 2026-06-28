import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class StartPlanDto {
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

  @ApiPropertyOptional({ example: '开工确认' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  allowWarningStart?: boolean;
}
