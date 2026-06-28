import { IsIn, IsOptional, IsString } from 'class-validator';

export class DrawingSearchQueryDto {
  @IsIn(['drawing', 'connector', 'fixture'])
  mode!: 'drawing' | 'connector' | 'fixture';

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
