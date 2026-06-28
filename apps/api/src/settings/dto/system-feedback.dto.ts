import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class SystemFeedbackDto {
  @ApiPropertyOptional() @IsString() @MaxLength(60) feedbackType!: string;
  @ApiPropertyOptional() @IsString() @MaxLength(100) title!: string;
  @ApiPropertyOptional() @IsString() @MaxLength(800) description!: string;
  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'critical'] }) @IsIn(['low', 'medium', 'high', 'critical']) severity!: 'low' | 'medium' | 'high' | 'critical';
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) currentPage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) role?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) userId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) userName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(240) screenshotRemark?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(400) expectedResult?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(400) actualResult?: string;
}

export class SystemFeedbackStatusDto {
  @ApiPropertyOptional({ enum: ['open', 'processing', 'resolved', 'ignored'] }) @IsIn(['open', 'processing', 'resolved', 'ignored']) status!: 'open' | 'processing' | 'resolved' | 'ignored';
}
