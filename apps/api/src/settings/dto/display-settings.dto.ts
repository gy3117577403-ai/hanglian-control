import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class DisplaySettingsDto {
  @ApiPropertyOptional({ enum: ['normal', 'large', 'extra_large'] }) @IsOptional() @IsIn(['normal', 'large', 'extra_large']) fontScale?: 'normal' | 'large' | 'extra_large';
  @ApiPropertyOptional({ enum: ['normal', 'comfortable'] }) @IsOptional() @IsIn(['normal', 'comfortable']) cardDensity?: 'normal' | 'comfortable';
  @ApiPropertyOptional() @IsOptional() @IsBoolean() defaultFieldMode?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showDemoBadges?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showTechnicalWarnings?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableWarmAnimations?: boolean;
  @ApiPropertyOptional({ enum: ['warm_3d'] }) @IsOptional() @IsIn(['warm_3d']) defaultTheme?: 'warm_3d';
}
