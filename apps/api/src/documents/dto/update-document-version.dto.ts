import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateDocumentVersionDto {
  @ApiProperty({ example: 'Rev.C' })
  @IsString()
  version: string;

  @ApiPropertyOptional({ example: 'pending_review', enum: ['effective', 'pending_review', 'expired', 'missing', 'inconsistent'] })
  @IsOptional()
  @IsIn(['effective', 'pending_review', 'expired', 'missing', 'inconsistent'])
  status?: 'effective' | 'pending_review' | 'expired' | 'missing' | 'inconsistent';
}
