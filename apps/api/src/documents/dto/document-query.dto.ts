import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import {
  DOCUMENT_CATEGORY_VALUES,
  type DocumentCategory,
} from '../document-categories';

export class DocumentQueryDto {
  @ApiPropertyOptional({ example: 'PLN-20260611-001' })
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiPropertyOptional({
    example: 'PLN-20260611-001',
    description: 'ArkTS 订单 ID；等同于 planId',
  })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ example: 'CUS-EV' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ example: 'PRD-4821A' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({
    enum: DOCUMENT_CATEGORY_VALUES,
    description:
      'ArkTS 固定资料分类：original_drawing/sop/finished_image/auxiliary_spec/notice/tooling',
  })
  @IsOptional()
  @IsIn(DOCUMENT_CATEGORY_VALUES)
  category?: DocumentCategory;

  @ApiPropertyOptional({
    enum: [
      'drawing_pdf',
      'sop_image',
      'connector_manual',
      'pinout_diagram',
      'finished_detail_image',
      'process_card',
    ],
  })
  @IsOptional()
  @IsIn([
    'drawing_pdf',
    'sop_image',
    'connector_manual',
    'pinout_diagram',
    'finished_detail_image',
    'process_card',
  ])
  documentType?:
    | 'drawing_pdf'
    | 'sop_image'
    | 'connector_manual'
    | 'pinout_diagram'
    | 'finished_detail_image'
    | 'process_card';

  @ApiPropertyOptional({
    enum: ['effective', 'pending_review', 'expired', 'missing', 'inconsistent'],
  })
  @IsOptional()
  @IsIn(['effective', 'pending_review', 'expired', 'missing', 'inconsistent'])
  status?:
    | 'effective'
    | 'pending_review'
    | 'expired'
    | 'missing'
    | 'inconsistent';
}
