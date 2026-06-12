import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateDocumentStatusDto {
  @ApiProperty({ example: 'effective', enum: ['effective', 'pending_review', 'expired', 'missing', 'inconsistent'] })
  @IsIn(['effective', 'pending_review', 'expired', 'missing', 'inconsistent'])
  status: 'effective' | 'pending_review' | 'expired' | 'missing' | 'inconsistent';

  @ApiPropertyOptional({ example: '版本确认' })
  @IsOptional()
  @IsString()
  reason?: string;
}
