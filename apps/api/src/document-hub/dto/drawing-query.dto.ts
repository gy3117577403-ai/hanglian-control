import { IsOptional, IsString } from 'class-validator';

export class DrawingQueryDto {
  @IsOptional()
  @IsString()
  q?: string;
}
