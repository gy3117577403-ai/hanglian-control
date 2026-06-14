import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateCustomerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sales?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerShortName?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'pending_review'] })
  @IsOptional()
  @IsIn(['active', 'inactive', 'pending_review'])
  status?: 'active' | 'inactive' | 'pending_review';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;
}
