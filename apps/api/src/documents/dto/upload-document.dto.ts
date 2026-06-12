import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UploadDocumentDto {
  @ApiPropertyOptional({ example: 'PLN-20260611-001', description: '生产计划 ID，可选' })
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiProperty({ example: 'PRD-4821A', description: '产品 ID' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    example: 'drawing_pdf',
    enum: ['drawing_pdf', 'sop_image', 'connector_manual', 'pinout_diagram', 'finished_detail_image', 'process_card'],
    description: '资料类型',
  })
  @IsIn(['drawing_pdf', 'sop_image', 'connector_manual', 'pinout_diagram', 'finished_detail_image', 'process_card'])
  documentType: 'drawing_pdf' | 'sop_image' | 'connector_manual' | 'pinout_diagram' | 'finished_detail_image' | 'process_card';

  @ApiProperty({ example: '高压采样线束总成图', description: '资料标题' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Rev.A', description: '版本号' })
  @IsString()
  @IsNotEmpty()
  version: string;

  @ApiPropertyOptional({
    example: 'effective',
    enum: ['effective', 'pending_review', 'expired', 'missing', 'inconsistent'],
    description: '资料状态',
  })
  @IsOptional()
  @IsIn(['effective', 'pending_review', 'expired', 'missing', 'inconsistent'])
  status?: 'effective' | 'pending_review' | 'expired' | 'missing' | 'inconsistent';

  @ApiProperty({ example: 'common', enum: ['front', 'back', 'common'], description: '适用工序' })
  @IsIn(['front', 'back', 'common'])
  requiredForProcess: 'front' | 'back' | 'common';

  @ApiPropertyOptional({ example: '孔位图,32P,Rev.A', description: '逗号分隔关键词' })
  @IsOptional()
  @IsString()
  keywords?: string;

  @ApiPropertyOptional({ example: '现场上传首版资料', description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}
