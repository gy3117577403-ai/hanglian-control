import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class QualityQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ enum: ['front', 'back', 'common'] })
  @IsOptional()
  @IsIn(['front', 'back', 'common'])
  processSegment?: 'front' | 'back' | 'common';

  @ApiPropertyOptional({ enum: ['effective', 'pending_review', 'expired'] })
  @IsOptional()
  @IsIn(['effective', 'pending_review', 'expired'])
  status?: 'effective' | 'pending_review' | 'expired';

  @ApiPropertyOptional({ enum: ['minor', 'major', 'critical'] })
  @IsOptional()
  @IsIn(['minor', 'major', 'critical'])
  defectLevel?: 'minor' | 'major' | 'critical';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}

