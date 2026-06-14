import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewRecordDto {
  @ApiProperty({ enum: ['mark_reviewed', 'mark_pending', 'mark_inconsistent'] })
  @IsIn(['mark_reviewed', 'mark_pending', 'mark_inconsistent'])
  action!: 'mark_reviewed' | 'mark_pending' | 'mark_inconsistent';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;
}
