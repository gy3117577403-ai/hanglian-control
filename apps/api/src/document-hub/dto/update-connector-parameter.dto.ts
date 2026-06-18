import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateConnectorParameterDto {
  @ApiPropertyOptional({ description: 'Connector model', example: 'CONN-16P-A' })
  @IsOptional()
  @IsString()
  connectorModel?: string;

  @ApiPropertyOptional({ description: 'Specification', example: '16P waterproof male terminal' })
  @IsOptional()
  @IsString()
  specification?: string;

  @ApiPropertyOptional({ description: 'Insertion length in mm', example: 18 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  insertionLengthMm?: number;

  @ApiPropertyOptional({ description: 'Outer strip length in mm', example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  outerStripLengthMm?: number;

  @ApiPropertyOptional({ description: 'Inner strip length in mm', example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  innerStripLengthMm?: number;

  @ApiPropertyOptional({ description: 'Remark or onsite note', example: '首件确认后再批量插接。' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiPropertyOptional({ description: 'Status', example: '启用' })
  @IsOptional()
  @IsString()
  status?: string;
}
