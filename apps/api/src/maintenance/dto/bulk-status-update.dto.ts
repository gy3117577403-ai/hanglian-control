import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class BulkStatusUpdateDto {
  @ApiProperty({ enum: ['product', 'production_plan', 'front_parameter', 'back_package', 'document'] })
  @IsIn(['product', 'production_plan', 'front_parameter', 'back_package', 'document'])
  entityType!: 'product' | 'production_plan' | 'front_parameter' | 'back_package' | 'document';

  @ApiProperty({ type: [String] })
  @IsArray()
  ids!: string[];

  @ApiProperty()
  @IsString()
  status!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
