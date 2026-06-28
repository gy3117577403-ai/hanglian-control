import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class RestoreItemDto {
  @ApiPropertyOptional({ description: '恢复原因' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkRestoreDto extends RestoreItemDto {
  @ApiProperty({ description: '资料 ID 列表', type: [String] })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
