import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ImportApplyDto {
  @ApiProperty({ description: '预览 ID', example: 'IMP-PREVIEW-1720000000000' })
  @IsString()
  previewId!: string;

  @ApiProperty({ description: '操作人 ID', example: 'demo-leader' })
  @IsString()
  operatorId!: string;

  @ApiProperty({ description: '操作人姓名', example: '组长演示账号' })
  @IsString()
  operatorName!: string;

  @ApiPropertyOptional({ description: '导入备注', example: '导入本周计划' })
  @IsOptional()
  @IsString()
  remark?: string;
}
