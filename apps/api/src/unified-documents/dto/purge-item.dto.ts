import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PurgeItemDto {
  @ApiProperty({ description: '删除密码' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: '必须输入：确认彻底删除' })
  @IsString()
  @IsNotEmpty()
  confirmText: string;

  @ApiPropertyOptional({ description: '彻底删除原因' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkPurgeDto extends PurgeItemDto {
  @ApiProperty({ description: '资料 ID 列表', type: [String] })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
