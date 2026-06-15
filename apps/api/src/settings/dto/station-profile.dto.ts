import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class StationProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) stationName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) stationCode?: string;
  @ApiPropertyOptional({ enum: ['front', 'back', 'common'] }) @IsOptional() @IsIn(['front', 'back', 'common']) processSegment?: 'front' | 'back' | 'common';
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) defaultRole?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) defaultTeam?: string;
  @ApiPropertyOptional({ enum: ['today', 'week'] }) @IsOptional() @IsIn(['today', 'week']) defaultPlanScope?: 'today' | 'week';
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() defaultTabs?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() enabledQuickActions?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showKnowledgePanel?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showExecutionPanel?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showAnalyticsPanel?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() fieldModeDefault?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(240) remark?: string;
}

export class UpdateStationProfileStatusDto {
  @ApiPropertyOptional({ enum: ['active', 'inactive'] }) @IsIn(['active', 'inactive']) status!: 'active' | 'inactive';
}
