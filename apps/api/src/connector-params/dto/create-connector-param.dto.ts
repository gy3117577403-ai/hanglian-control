import { Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

function trim(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

function optionalNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) return undefined;
  return Number(value);
}

function nullableNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) return null;
  return Number(value);
}

export class CreateConnectorParamDto {
  @Transform(({ value }) => trim(value))
  @IsString()
  connectorModel!: string;

  @Transform(({ value }) => optionalNumber(value))
  @IsOptional()
  @IsNumber()
  @Min(0)
  insertionLength?: number;

  @Transform(({ value }) => optionalNumber(value))
  @IsOptional()
  @IsNumber()
  @Min(0)
  insertionLengthMm?: number;

  @Transform(({ value }) => nullableNumber(value))
  @IsOptional()
  @IsNumber()
  @Min(0)
  outerStripLength?: number | null;

  @Transform(({ value }) => nullableNumber(value))
  @IsOptional()
  @IsNumber()
  @Min(0)
  outerStripLengthMm?: number | null;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  innerStripLength?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  innerStripLengthMm?: number;

  @Transform(({ value }) => trim(value))
  @IsOptional()
  @IsString()
  remark?: string;

  @Transform(({ value }) => trim(value))
  @IsOptional()
  @IsString()
  status?: string;
}
