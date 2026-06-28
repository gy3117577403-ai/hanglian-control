import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateProductionPlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  planDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  weekPlanCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sales?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  plannedQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  completedQuantity?: number;

  @ApiPropertyOptional({ enum: ['待生产', '生产中', '已完成', '异常'] })
  @IsOptional()
  @IsIn(['待生产', '生产中', '已完成', '异常'])
  planStatus?: '待生产' | '生产中' | '已完成' | '异常';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsiblePerson?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;
}
