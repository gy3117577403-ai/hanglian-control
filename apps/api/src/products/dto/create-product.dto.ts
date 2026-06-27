import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'CUS-EV' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: 'HL-EV-4821A' })
  @IsString()
  @IsNotEmpty()
  productCode: string;

  @ApiProperty({ example: '电池包高压采样线束' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ example: 'V2.3' })
  @IsString()
  @IsNotEmpty()
  currentVersion: string;

  @ApiPropertyOptional({ example: '通用', enum: ['前段', '后段', '通用'] })
  @IsOptional()
  @IsIn(['前段', '后段', '通用'])
  processSegment?: '前段' | '后段' | '通用';
}
