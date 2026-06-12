import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SetEffectiveDocumentDto {
  @ApiPropertyOptional({ description: '设置为当前有效版本的原因' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ default: 'demo-leader' })
  @IsOptional()
  @IsString()
  operatorId?: string;

  @ApiPropertyOptional({ default: '组长演示账号' })
  @IsOptional()
  @IsString()
  operatorName?: string;

  @ApiPropertyOptional({ default: '组长' })
  @IsOptional()
  @IsString()
  operatorRole?: string;
}
