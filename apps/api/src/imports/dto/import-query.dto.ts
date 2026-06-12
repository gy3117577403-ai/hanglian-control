import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { ImportType } from '../../common/types/production.types';

export class ImportHistoryQueryDto {
  @ApiPropertyOptional({
    description: '导入类型',
    enum: ['production_plan', 'customer_product', 'front_parameter', 'back_package'],
  })
  @IsOptional()
  @IsIn(['production_plan', 'customer_product', 'front_parameter', 'back_package'])
  type?: ImportType;

  @ApiPropertyOptional({ description: '只读限制条数', example: '50' })
  @IsOptional()
  @IsString()
  limit?: string;
}
