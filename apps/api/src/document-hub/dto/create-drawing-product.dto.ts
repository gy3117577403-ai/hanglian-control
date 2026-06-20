import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

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
}
