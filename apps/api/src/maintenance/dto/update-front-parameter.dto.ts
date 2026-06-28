import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateFrontParameterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cutLength?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stripLength?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  terminalModel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pullForceStandard?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  crimpHeight?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  drawingVersion?: string;

  @ApiPropertyOptional({ enum: ['当前有效', '待确认', '已失效', '不一致'] })
  @IsOptional()
  @IsIn(['当前有效', '待确认', '已失效', '不一致'])
  parameterStatus?: '当前有效' | '待确认' | '已失效' | '不一致';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;
}
