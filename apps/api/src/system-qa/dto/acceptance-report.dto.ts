import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsOptional } from 'class-validator';

export class AcceptanceReportDto {
  @ApiPropertyOptional({ description: '是否包含详细检查项', default: true })
  @IsOptional()
  @IsBooleanString()
  includeDetails?: string = 'true';
}
