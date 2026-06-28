import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateFixtureDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fixtureCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fixtureName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fixtureType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional({ enum: ['front', 'back', 'common'] })
  @IsOptional()
  @IsIn(['front', 'back', 'common'])
  processSegment?: 'front' | 'back' | 'common';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  applicableStation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  usageMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checkStandard?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maintenanceCycle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastMaintenanceDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextMaintenanceDate?: string;

  @ApiPropertyOptional({ enum: ['active', 'pending_review', 'inactive', 'abnormal'] })
  @IsOptional()
  @IsIn(['active', 'pending_review', 'inactive', 'abnormal'])
  status?: 'active' | 'pending_review' | 'inactive' | 'abnormal';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  relatedDocumentIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  keywords?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;
}

