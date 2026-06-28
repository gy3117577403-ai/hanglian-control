import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class TrashDocumentDto {
  @ApiProperty({ description: '\u5220\u9664\u5bc6\u7801' })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  password!: string;

  @ApiPropertyOptional({ description: '\u5220\u9664\u539f\u56e0' })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @ApiPropertyOptional({ description: '\u64cd\u4f5c\u5458 ID' })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  operatorId?: string;

  @ApiPropertyOptional({ description: '\u64cd\u4f5c\u5458\u540d\u79f0' })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  operatorName?: string;
}

export class RestoreDocumentDto {
  @ApiPropertyOptional({ description: '\u64cd\u4f5c\u5458 ID' })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  operatorId?: string;

  @ApiPropertyOptional({ description: '\u64cd\u4f5c\u5458\u540d\u79f0' })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  operatorName?: string;

  @ApiPropertyOptional({ description: '\u6062\u590d\u5907\u6ce8' })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class PurgeDocumentDto {
  @ApiProperty({ description: '\u5220\u9664\u5bc6\u7801' })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  password!: string;

  @ApiProperty({ description: '\u786e\u8ba4\u6587\u5b57' })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  confirmText!: string;

  @ApiPropertyOptional({ description: '\u5f7b\u5e95\u5220\u9664\u539f\u56e0' })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @ApiPropertyOptional({ description: '\u64cd\u4f5c\u5458 ID' })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  operatorId?: string;

  @ApiPropertyOptional({ description: '\u64cd\u4f5c\u5458\u540d\u79f0' })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  operatorName?: string;
}

export class TrashQueryDto {
  @ApiPropertyOptional({ description: '\u5ba2\u6237 ID' })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerId?: string;

  @ApiPropertyOptional({ description: '\u4ea7\u54c1 ID' })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  productId?: string;

  @ApiPropertyOptional({ description: '\u6a21\u5757 key' })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(40)
  moduleKey?: string;

  @ApiPropertyOptional({ description: '\u5173\u952e\u5b57' })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  keyword?: string;

  @ApiPropertyOptional({ description: '\u8fd4\u56de\u6570\u91cf\uff0c\u6700\u5927 100', default: 50 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: '\u8df3\u8fc7\u6570\u91cf', default: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}
