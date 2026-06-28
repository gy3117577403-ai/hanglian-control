import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

function trim(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class RecycleBinQueryDto {
  @Transform(({ value }) => trim(value))
  @IsOptional()
  @IsString()
  customerId?: string;

  @Transform(({ value }) => trim(value))
  @IsOptional()
  @IsString()
  productId?: string;

  @Transform(({ value }) => trim(value))
  @IsOptional()
  @IsString()
  category?: string;

  @Transform(({ value }) => trim(value))
  @IsOptional()
  @IsString()
  keyword?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}
