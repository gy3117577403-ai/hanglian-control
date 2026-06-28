import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'CUS-EV' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ example: 'HL-EV-4821A' })
  @IsOptional()
  @IsString()
  productCode?: string;

  @ApiPropertyOptional({ example: '电池包高压采样线束' })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional({ example: 'V2.3' })
  @IsOptional()
  @IsString()
  currentVersion?: string;

  @ApiPropertyOptional({ example: '通用', enum: ['前段', '后段', '通用'] })
  @IsOptional()
  @IsIn(['前段', '后段', '通用'])
  processSegment?: '前段' | '后段' | '通用';
}
