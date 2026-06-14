import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ExceptionHoldDto {
  @ApiProperty({ example: '资料不一致，等待工艺复核' })
  @IsString()
  reason!: string;

  @ApiPropertyOptional({ example: 'FB-001' })
  @IsOptional()
  @IsString()
  feedbackId?: string;

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
