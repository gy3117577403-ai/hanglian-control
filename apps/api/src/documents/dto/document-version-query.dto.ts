import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class DocumentVersionQueryDto {
  @ApiPropertyOptional({ description: '产品 ID' })
  @IsString()
  productId!: string;

  @ApiPropertyOptional({ description: '资料类型' })
  @IsOptional()
  @IsIn(['drawing_pdf', 'sop_image', 'connector_manual', 'pinout_diagram', 'finished_detail_image', 'process_card'])
  documentType?: 'drawing_pdf' | 'sop_image' | 'connector_manual' | 'pinout_diagram' | 'finished_detail_image' | 'process_card';

  @ApiPropertyOptional({ description: '适用工序' })
  @IsOptional()
  @IsIn(['front', 'back', 'common'])
  requiredForProcess?: 'front' | 'back' | 'common';
}
