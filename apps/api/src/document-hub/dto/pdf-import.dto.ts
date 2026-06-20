import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class PdfImportPreviewDto {
  @ApiProperty({ description: '?????? ID' })
  @IsString()
  customerId!: string;
}

export class PdfImportItemDecisionDto {
  @ApiProperty({ description: '??? ID' })
  @IsString()
  importItemId!: string;

  @ApiProperty({ description: '????????' })
  @IsString()
  productModel!: string;

  @ApiPropertyOptional({ description: '???' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: '?????create_product / add_version / skip' })
  @IsOptional()
  @IsString()
  action?: 'create_product' | 'add_version' | 'skip';
}

export class PdfImportApplyDto {
  @ApiProperty({ description: '???? ID' })
  @IsString()
  importBatchId!: string;

  @ApiPropertyOptional({ description: '????????' })
  @IsOptional()
  @IsArray()
  items?: PdfImportItemDecisionDto[];
}
