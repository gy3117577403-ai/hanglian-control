import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { ProcessConfirmResult, ProcessConfirmType } from '../execution.types';

export class ProcessConfirmationDto {
  @ApiProperty({
    enum: ['front_parameter_checked', 'back_document_checked', 'fixture_checked', 'quality_checked', 'first_piece_checked', 'other'],
    example: 'fixture_checked',
  })
  @IsIn(['front_parameter_checked', 'back_document_checked', 'fixture_checked', 'quality_checked', 'first_piece_checked', 'other'])
  confirmType!: ProcessConfirmType;

  @ApiProperty({ enum: ['pass', 'warning', 'fail'], example: 'pass' })
  @IsIn(['pass', 'warning', 'fail'])
  result!: ProcessConfirmResult;

  @ApiPropertyOptional({ example: '已确认' })
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
