import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { ImportType } from '../../common/types/production.types';

export class ImportTemplateParamsDto {
  @ApiProperty({
    description: '模板类型',
    enum: ['production_plan', 'customer_product', 'front_parameter', 'back_package'],
  })
  @IsIn(['production_plan', 'customer_product', 'front_parameter', 'back_package'])
  type!: ImportType;
}
