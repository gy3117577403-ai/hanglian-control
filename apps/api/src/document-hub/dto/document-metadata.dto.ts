import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateDrawingDocumentMetadataDto {
  @ApiPropertyOptional({ description: '资料标题' })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({ description: '资料版本，可为空' })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  version?: string;

  @ApiPropertyOptional({ description: '关键词，支持字符串数组或逗号分隔文本' })
  @IsOptional()
  keywords?: string[] | string;

  @ApiPropertyOptional({ description: '备注，可为空' })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;

  @ApiPropertyOptional({ description: '操作员 ID' })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  operatorId?: string;

  @ApiPropertyOptional({ description: '操作员名称' })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  operatorName?: string;
}

export class DrawingDocumentOperatorDto {
  @ApiPropertyOptional({ description: '操作员 ID' })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  operatorId?: string;

  @ApiPropertyOptional({ description: '操作员名称' })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  operatorName?: string;
}
