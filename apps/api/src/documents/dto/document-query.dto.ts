import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class DocumentQueryDto {
  @ApiPropertyOptional({ example: 'PLN-20260611-001' })
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiPropertyOptional({ example: 'PRD-4821A' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ enum: ['drawing_pdf', 'sop_image', 'connector_manual', 'pinout_diagram', 'finished_detail_image', 'process_card'] })
  @IsOptional()
  @IsIn(['drawing_pdf', 'sop_image', 'connector_manual', 'pinout_diagram', 'finished_detail_image', 'process_card'])
  documentType?: 'drawing_pdf' | 'sop_image' | 'connector_manual' | 'pinout_diagram' | 'finished_detail_image' | 'process_card';

  @ApiPropertyOptional({ enum: ['effective', 'pending_review', 'expired', 'missing', 'inconsistent'] })
  @IsOptional()
  @IsIn(['effective', 'pending_review', 'expired', 'missing', 'inconsistent'])
  status?: 'effective' | 'pending_review' | 'expired' | 'missing' | 'inconsistent';
}
