import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class AnnouncementDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) content?: string;
  @ApiPropertyOptional({ enum: ['notice', 'document_change', 'pilot_reminder', 'maintenance'] }) @IsOptional() @IsIn(['notice', 'document_change', 'pilot_reminder', 'maintenance']) type?: 'notice' | 'document_change' | 'pilot_reminder' | 'maintenance';
  @ApiPropertyOptional({ enum: ['info', 'warning', 'critical'] }) @IsOptional() @IsIn(['info', 'warning', 'critical']) severity?: 'info' | 'warning' | 'critical';
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() pinned?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() startAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endAt?: string;
}

export class AnnouncementStatusDto {
  @ApiPropertyOptional() @IsBoolean() active!: boolean;
}
