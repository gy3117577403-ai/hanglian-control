import { IsOptional, IsString } from 'class-validator';

export class FixtureQueryDto {
  @IsOptional()
  @IsString()
  q?: string;
}
