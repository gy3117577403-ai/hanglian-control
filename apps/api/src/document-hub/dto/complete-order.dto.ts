import { IsOptional, IsString } from 'class-validator';

export class CompleteOrderDto {
  @IsOptional()
  @IsString()
  completedBy?: string;
}
