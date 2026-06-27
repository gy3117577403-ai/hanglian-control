import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: '华东新能源' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'EV-EAST' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: '刘敏' })
  @IsOptional()
  @IsString()
  salesOwner?: string;
}
