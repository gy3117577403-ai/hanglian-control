import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export const uploadUnifiedTypes = [
  'drawing_pdf',
  'sop_image',
  'connector_manual',
  'pinout_diagram',
  'finished_detail_image',
  'process_card',
] as const;

export class UnifiedUploadDto {
  @ApiPropertyOptional({ description: '客户名称', example: '本地客户' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({ description: '产品编号', example: 'HL-LOCAL-001' })
  @IsString()
  @IsNotEmpty()
  productCode: string;

  @ApiProperty({ description: '产品名称', example: '本地上传线束资料包' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiPropertyOptional({ description: '产品版本', example: 'Rev.A' })
  @IsOptional()
  @IsString()
  productVersion?: string;

  @ApiProperty({ enum: uploadUnifiedTypes, description: '资料类型' })
  @IsIn(uploadUnifiedTypes)
  documentType: typeof uploadUnifiedTypes[number];

  @ApiProperty({ description: '资料标题', example: '本地图纸 Rev.A' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: '资料版本', example: 'Rev.A' })
  @IsString()
  @IsNotEmpty()
  version: string;

  @ApiPropertyOptional({ enum: ['effective', 'pending_review', 'expired', 'missing', 'inconsistent'], description: '资料状态' })
  @IsOptional()
  @IsIn(['effective', 'pending_review', 'expired', 'missing', 'inconsistent'])
  status?: 'effective' | 'pending_review' | 'expired' | 'missing' | 'inconsistent';

  @ApiPropertyOptional({ enum: ['front', 'back', 'common'], description: '适用范围' })
  @IsOptional()
  @IsIn(['front', 'back', 'common'])
  requiredForProcess?: 'front' | 'back' | 'common';

  @ApiPropertyOptional({ description: '逗号分隔关键词' })
  @IsOptional()
  @IsString()
  keywords?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}
