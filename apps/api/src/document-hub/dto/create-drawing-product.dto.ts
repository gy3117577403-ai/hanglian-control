import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateDrawingProductDto {
  @ApiProperty({ description: 'Customer id' })
  @IsString()
  customerId!: string;

  @ApiProperty({ description: 'Product model' })
  @IsString()
  productModel!: string;

  @ApiPropertyOptional({ description: 'Product name' })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional({ description: 'Remark' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiPropertyOptional({ description: 'Creation source', enum: ['manual_create'] })
  @IsOptional()
  @IsIn(['manual_create'])
  source?: 'manual_create';
}
