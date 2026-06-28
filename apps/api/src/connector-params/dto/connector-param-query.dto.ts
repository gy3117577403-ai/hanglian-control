import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

function trim(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class ConnectorParamQueryDto {
  @Transform(({ value }) => trim(value))
  @IsOptional()
  @IsString()
  keyword?: string;

  @Transform(({ value }) => trim(value))
  @IsOptional()
  @IsString()
  q?: string;

  @Transform(({ value }) => trim(value))
  @IsOptional()
  @IsString()
  status?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}
