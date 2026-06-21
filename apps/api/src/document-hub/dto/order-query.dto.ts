import { IsIn, IsOptional, IsString } from 'class-validator';

export class OrderQueryDto {
  @IsOptional()
  @IsIn(['today', 'week', 'all'])
  scope?: 'today' | 'week' | 'all';

  @IsOptional()
  @IsString()
  includeCompleted?: string;

  @IsOptional()
  @IsIn(['pending', 'completed', 'all'])
  completionStatus?: 'pending' | 'completed' | 'all';

  @IsOptional()
  @IsIn(['front', 'back', 'no_drawing'])
  productionStatus?: 'front' | 'back' | 'no_drawing';

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  linkedProductId?: string;
}
