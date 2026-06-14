import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateDocumentMaintenanceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ enum: ['effective', 'pending_review', 'expired', 'missing', 'inconsistent'] })
  @IsOptional()
  @IsIn(['effective', 'pending_review', 'expired', 'missing', 'inconsistent'])
  status?: 'effective' | 'pending_review' | 'expired' | 'missing' | 'inconsistent';

  @ApiPropertyOptional({ enum: ['front', 'back', 'common'] })
  @IsOptional()
  @IsIn(['front', 'back', 'common'])
  requiredForProcess?: 'front' | 'back' | 'common';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  keywords?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;
}
