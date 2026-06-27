import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: '华东新能源' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'EV-EAST' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: '刘敏' })
  @IsOptional()
  @IsString()
  salesOwner?: string;
}
