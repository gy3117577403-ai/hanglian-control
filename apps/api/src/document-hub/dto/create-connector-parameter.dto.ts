import { Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConnectorParameterDto {
  @ApiProperty({ description: 'Connector model', example: 'CONN-16P-A' })
  @IsString()
  connectorModel!: string;

  @ApiPropertyOptional({ description: 'Specification', example: '16P waterproof male terminal' })
  @IsOptional()
  @IsString()
  specification?: string;

  @ApiProperty({ description: 'Insertion length in mm', example: 18 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  insertionLengthMm!: number;

  @ApiPropertyOptional({ description: 'Outer strip length in mm. Leave empty when this connector has no outer strip parameter.', example: 12, nullable: true })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? null : Number(value)))
  @IsNumber()
  @Min(0)
  outerStripLengthMm?: number | null;

  @ApiProperty({ description: 'Inner strip length in mm', example: 4 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  innerStripLengthMm!: number;

  @ApiPropertyOptional({ description: 'Status', example: '启用' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Remark or onsite note', example: '首件确认后再批量插接。' })
  @IsOptional()
  @IsString()
  remark?: string;
}
