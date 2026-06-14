import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CompletePlanDto {
  @ApiProperty({ example: 500 })
  @IsInt()
  @Min(0)
  finalCompletedQuantity!: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  finalDefectQuantity?: number;

  @ApiPropertyOptional({ example: '完工确认' })
  @IsOptional()
  @IsString()
  remark?: string;

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
