import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSystemSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) systemName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) workshopName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) defaultTeam?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) defaultRole?: string;
  @ApiPropertyOptional({ enum: ['today', 'week'] }) @IsOptional() @IsIn(['today', 'week']) defaultPlanScope?: 'today' | 'week';
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowWarningStart?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableFieldMode?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableDemoTools?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(240) remark?: string;
}
