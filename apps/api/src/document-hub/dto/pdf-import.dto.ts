import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class PdfImportPreviewFormDto {
  @ApiProperty({ description: '已有图纸客户 ID。Preview 只读取客户，不会自动创建或修改客户。' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: '请选择客户。' })
  customerId!: string;
}

export class PdfImportPreviewDto extends PdfImportPreviewFormDto {}

export class PdfImportPreviewSummaryDto {
  @ApiProperty({ description: '本批文件总数' })
  totalFiles!: number;

  @ApiProperty({ description: '将创建产品的文件数' })
  createProduct!: number;

  @ApiProperty({ description: '将作为已有产品新版本导入的文件数' })
  addVersion!: number;

  @ApiProperty({ description: '重复文件跳过数' })
  skipDuplicate!: number;

  @ApiProperty({ description: '需要人工确认型号的文件数' })
  needsConfirmation!: number;

  @ApiProperty({ description: '文件级错误数' })
  error!: number;

  @ApiPropertyOptional({ description: '可直接进入后续 Apply 的文件数' })
  successCount?: number;

  @ApiPropertyOptional({ description: '跳过文件数' })
  skippedCount?: number;

  @ApiPropertyOptional({ description: '错误文件数' })
  errorCount?: number;

  @ApiPropertyOptional({ description: '需确认文件数' })
  needsConfirmationCount?: number;
}

export class PdfImportPreviewCustomerDto {
  @ApiProperty({ description: '客户 ID' })
  customerId!: string;

  @ApiProperty({ description: '客户名称' })
  customerName!: string;

  @ApiPropertyOptional({ description: '客户简称' })
  customerShortName?: string;
}

export class PdfImportPreviewItemDto {
  @ApiProperty({ description: 'Preview item ID' })
  importItemId!: string;

  @ApiProperty({ description: '原始上传文件名' })
  originalFileName!: string;

  @ApiProperty({ description: 'MIME 类型' })
  mimeType!: string;

  @ApiProperty({ description: '文件大小，单位 byte' })
  fileSize!: number;

  @ApiProperty({ description: '文件 SHA-256，小写十六进制' })
  checksumSha256!: string;

  @ApiProperty({ description: '从文件名解析出的产品型号' })
  parsedProductModel!: string;

  @ApiProperty({ description: 'Preview 阶段确认的产品型号，默认等于解析结果' })
  confirmedProductModel!: string;

  @ApiPropertyOptional({ description: '从文件名解析出的版本' })
  parsedVersion?: string;

  @ApiProperty({ description: '文件名解析置信度', enum: ['high', 'medium', 'low'] })
  confidence!: 'high' | 'medium' | 'low';

  @ApiProperty({ description: '是否需要人工确认型号' })
  needsConfirmation!: boolean;

  @ApiProperty({ description: '文件名解析提示' })
  parseWarnings!: string[];

  @ApiPropertyOptional({ description: '匹配到的已有产品 ID' })
  existingProductId?: string;

  @ApiPropertyOptional({ description: '匹配到的已有资料 ID' })
  existingDocumentId?: string;

  @ApiProperty({
    description: 'Preview 建议动作',
    enum: ['create_product', 'add_version', 'skip_duplicate', 'needs_confirmation', 'error'],
  })
  action!: 'create_product' | 'add_version' | 'skip_duplicate' | 'needs_confirmation' | 'error' | 'skip';

  @ApiPropertyOptional({ description: '中文处理提示' })
  message?: string;

  @ApiPropertyOptional({ description: '中文错误信息' })
  errorMessage?: string;
}

export class PdfImportPreviewResponseDto {
  @ApiProperty({ description: 'PDF 导入 Preview 批次 ID' })
  importBatchId!: string;

  @ApiProperty({ type: PdfImportPreviewCustomerDto })
  customer!: PdfImportPreviewCustomerDto;

  @ApiProperty({
    description: 'Preview 批次状态',
    enum: ['previewed', 'expired', 'applying', 'completed', 'partially_applied', 'failed', 'applied', 'partial', 'error'],
  })
  status!: 'previewed' | 'expired' | 'applying' | 'completed' | 'partially_applied' | 'failed' | 'applied' | 'partial' | 'error';

  @ApiPropertyOptional({ description: '批次级中文提示' })
  message?: string;

  @ApiPropertyOptional({ description: 'Preview 批次过期时间' })
  expiresAt?: string;

  @ApiProperty({ type: PdfImportPreviewSummaryDto })
  summary!: PdfImportPreviewSummaryDto;

  @ApiProperty({ type: [PdfImportPreviewItemDto] })
  items!: PdfImportPreviewItemDto[];

  @ApiPropertyOptional({ type: Object })
  applySummary?: PdfImportApplyResponseDto['summary'];

  @ApiPropertyOptional({ type: Array })
  applyItems?: PdfImportApplyResponseDto['items'];

  @ApiPropertyOptional()
  appliedAt?: string;
}

export class PdfImportItemDecisionDto {
  @ApiProperty({ description: 'Preview item ID' })
  @IsString()
  importItemId!: string;

  @ApiProperty({ description: '用户确认后的产品型号' })
  @IsString()
  productModel!: string;

  @ApiPropertyOptional({ description: '用户确认后的版本' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: '用户确认后的动作，Apply 暂未实现' })
  @IsOptional()
  @IsString()
  action?: 'create_product' | 'add_version' | 'skip';
}

export class LegacyPdfImportApplyDto {
  @ApiProperty({ description: 'Preview 批次 ID' })
  @IsString()
  importBatchId!: string;

  @ApiPropertyOptional({ description: '用户确认后的 item 决策，Apply 暂未实现' })
  @IsOptional()
  @IsArray()
  items?: PdfImportItemDecisionDto[];
}

export class PdfImportApplyItemDto {
  @ApiProperty({ description: 'Preview item ID' })
  @IsString()
  @IsNotEmpty()
  importItemId!: string;

  @ApiPropertyOptional({ description: '是否应用本文件；默认 true' })
  @IsOptional()
  @IsBoolean()
  selected?: boolean;

  @ApiPropertyOptional({ description: '用户确认或修正后的产品型号' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  confirmedProductModel?: string;

  @ApiPropertyOptional({ description: '用户确认或修正后的版本号' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  confirmedVersion?: string;

  @ApiPropertyOptional({ description: '新产品名称；为空时使用产品型号' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  productName?: string;

  @ApiPropertyOptional({ description: '是否设为当前有效版本' })
  @IsOptional()
  @IsBoolean()
  setAsEffective?: boolean;
}

export class PdfImportApplyDto {
  @ApiProperty({ description: 'Preview 批次 ID' })
  @IsString()
  @IsNotEmpty()
  importBatchId!: string;

  @ApiProperty({ type: [PdfImportApplyItemDto], description: '本次要应用或跳过的 Preview item' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PdfImportApplyItemDto)
  items!: PdfImportApplyItemDto[];

  @ApiPropertyOptional({ description: '导入备注' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @ApiPropertyOptional({ description: '操作员 ID' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  operatorId?: string;

  @ApiPropertyOptional({ description: '操作员名称' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  operatorName?: string;
}

export class PdfImportApplySummaryDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  createdProduct!: number;

  @ApiProperty()
  addedVersion!: number;

  @ApiProperty()
  skippedDuplicate!: number;

  @ApiProperty()
  needsConfirmation!: number;

  @ApiProperty()
  skippedByUser!: number;

  @ApiProperty()
  error!: number;
}

export class PdfImportApplyResultItemDto {
  @ApiProperty()
  importItemId!: string;

  @ApiProperty()
  originalFileName!: string;

  @ApiProperty()
  confirmedProductModel!: string;

  @ApiPropertyOptional()
  productId?: string;

  @ApiPropertyOptional()
  documentId?: string;

  @ApiProperty({ enum: ['created_product', 'added_version', 'skipped_duplicate', 'needs_confirmation', 'skipped_by_user', 'error'] })
  result!: 'created_product' | 'added_version' | 'skipped_duplicate' | 'needs_confirmation' | 'skipped_by_user' | 'error';

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional()
  documentStatus?: string;

  @ApiPropertyOptional()
  setAsEffective?: boolean;

  @ApiPropertyOptional()
  errorMessage?: string;
}

export class PdfImportApplyResponseDto {
  @ApiProperty()
  importBatchId!: string;

  @ApiProperty({ enum: ['completed', 'partially_applied', 'failed'] })
  status!: 'completed' | 'partially_applied' | 'failed';

  @ApiProperty({ type: PdfImportPreviewCustomerDto })
  customer!: PdfImportPreviewCustomerDto;

  @ApiProperty({ type: PdfImportApplySummaryDto })
  summary!: PdfImportApplySummaryDto;

  @ApiProperty({ type: [PdfImportApplyResultItemDto] })
  items!: PdfImportApplyResultItemDto[];

  @ApiPropertyOptional()
  appliedAt?: string;
}
