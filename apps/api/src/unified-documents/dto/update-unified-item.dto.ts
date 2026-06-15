import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { uploadUnifiedTypes } from './unified-upload.dto';

export class UpdateUnifiedItemDto {
  @ApiPropertyOptional({ description: '客户名称' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: '产品编号' })
  @IsOptional()
  @IsString()
  productCode?: string;

  @ApiPropertyOptional({ description: '产品名称' })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional({ description: '产品版本' })
  @IsOptional()
  @IsString()
  productVersion?: string;

  @ApiPropertyOptional({ enum: uploadUnifiedTypes, description: '资料类型' })
  @IsOptional()
  @IsIn(uploadUnifiedTypes)
  documentType?: typeof uploadUnifiedTypes[number];

  @ApiPropertyOptional({ description: '资料标题' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '资料版本' })
  @IsOptional()
  @IsString()
  version?: string;

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
