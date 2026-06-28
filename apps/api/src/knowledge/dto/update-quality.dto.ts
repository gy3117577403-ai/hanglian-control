import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateQualityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qualityCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

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
  inspectionItem?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  standardValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tolerance?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inspectionMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  samplingRule?: string;

  @ApiPropertyOptional({ enum: ['minor', 'major', 'critical'] })
  @IsOptional()
  @IsIn(['minor', 'major', 'critical'])
  defectLevel?: 'minor' | 'major' | 'critical';

  @ApiPropertyOptional({ enum: ['effective', 'pending_review', 'expired'] })
  @IsOptional()
  @IsIn(['effective', 'pending_review', 'expired'])
  status?: 'effective' | 'pending_review' | 'expired';

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

