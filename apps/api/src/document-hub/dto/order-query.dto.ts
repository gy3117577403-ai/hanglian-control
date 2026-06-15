import { IsIn, IsOptional, IsString } from 'class-validator';

export class OrderQueryDto {
  @IsOptional()
  @IsIn(['today', 'week', 'all'])
  scope?: 'today' | 'week' | 'all';

  @IsOptional()
  @IsString()
  includeCompleted?: string;
}
