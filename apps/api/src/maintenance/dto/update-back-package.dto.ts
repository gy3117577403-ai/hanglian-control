import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateBackPackageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  connectorModel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  connectorManual?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pinoutDiagram?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  processSop?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  finishedDetailImageCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  drawingVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sopVersion?: string;

  @ApiPropertyOptional({ enum: ['当前有效', '待确认', '已失效', '不一致'] })
  @IsOptional()
  @IsIn(['当前有效', '待确认', '已失效', '不一致'])
  packageStatus?: '当前有效' | '待确认' | '已失效' | '不一致';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;
}
