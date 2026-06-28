import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FileHealthQueryDto {
  @ApiPropertyOptional({ example: 'PLN-20260611-001' })
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiPropertyOptional({ example: 'PRD-4821A' })
  @IsOptional()
  @IsString()
  productId?: string;
}
