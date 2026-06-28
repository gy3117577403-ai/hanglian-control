import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderImportPreviewFormDto {
  @ApiProperty({ enum: ['today', 'week'] })
  @IsIn(['today', 'week'])
  scope!: 'today' | 'week';
}

export class OrderImportApplyItemDto {
  @ApiProperty()
  @IsString()
  importItemId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  selected?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  confirmedCustomerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  confirmedProductId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;
}

export class OrderImportApplyDto {
  @ApiProperty()
  @IsString()
  importBatchId!: string;

  @ApiProperty({ type: [OrderImportApplyItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderImportApplyItemDto)
  items!: OrderImportApplyItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  operatorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  operatorName?: string;
}
