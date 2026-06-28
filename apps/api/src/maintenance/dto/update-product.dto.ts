import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productCategory?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'pending_review'] })
  @IsOptional()
  @IsIn(['active', 'inactive', 'pending_review'])
  status?: 'active' | 'inactive' | 'pending_review';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  aliases?: string[];
}
