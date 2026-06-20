import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateDrawingCustomerDto {
  @ApiProperty({ description: 'Customer name' })
  @IsString()
  customerName!: string;

  @ApiPropertyOptional({ description: 'Customer short name' })
  @IsOptional()
  @IsString()
  customerShortName?: string;

  @ApiPropertyOptional({ description: 'Customer code' })
  @IsOptional()
  @IsString()
  customerCode?: string;

  @ApiPropertyOptional({ description: 'Customer aliases', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @ApiPropertyOptional({ description: 'Customer status', enum: ['active', 'disabled'], default: 'active' })
  @IsOptional()
  @IsIn(['active', 'disabled'])
  status?: 'active' | 'disabled';
}
