import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ResolveDrawingProductDto {
  @ApiProperty({ description: 'Order product model' })
  @IsString()
  productModel!: string;

  @ApiPropertyOptional({ description: 'Known drawing customer id' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Order customer name' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Order customer short name' })
  @IsOptional()
  @IsString()
  customerShortName?: string;
}
