import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class KnowledgeBulkUpdateDto {
  @ApiProperty({ description: 'Knowledge item ids to update', example: ['FIX-HV-4821A-CRIMP'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids!: string[];

  @ApiProperty({ description: 'Allowed patch fields only', example: { status: 'pending_review', processSegment: 'front' } })
  @IsObject()
  patch!: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Maintenance reason', example: 'V2.4 batch review' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Operator id', example: 'mock-maintainer' })
  @IsOptional()
  @IsString()
  operatorId?: string;

  @ApiPropertyOptional({ description: 'Operator name', example: '资料维护演示' })
  @IsOptional()
  @IsString()
  operatorName?: string;

  @ApiPropertyOptional({ description: 'Operator role', example: '资料维护' })
  @IsOptional()
  @IsString()
  operatorRole?: string;
}
