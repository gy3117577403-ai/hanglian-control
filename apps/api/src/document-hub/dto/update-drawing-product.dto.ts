import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateDrawingProductDto {
  @ApiPropertyOptional({ description: 'Product model' })
  @IsOptional()
  @IsString()
  productModel?: string;

  @ApiPropertyOptional({ description: 'Product name' })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional({ description: 'Remark' })
  @IsOptional()
  @IsString()
  remark?: string;
}
