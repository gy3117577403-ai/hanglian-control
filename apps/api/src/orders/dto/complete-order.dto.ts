import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class CompleteOrderDto {
  @ApiPropertyOptional({ example: 1200, description: '不传时默认完成计划数量' })
  @IsOptional()
  @IsInt()
  @Min(0)
  completedQuantity?: number;
}
