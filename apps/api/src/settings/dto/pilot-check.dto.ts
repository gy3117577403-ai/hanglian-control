import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RunPilotCheckDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) remark?: string;
}
