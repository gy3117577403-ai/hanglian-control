import { IsIn, IsOptional, IsString } from 'class-validator';

export class HubSearchQueryDto {
  @IsIn(['drawing', 'connector', 'fixture'])
  mode!: 'drawing' | 'connector' | 'fixture';

  @IsOptional()
  @IsString()
  q?: string;
}
