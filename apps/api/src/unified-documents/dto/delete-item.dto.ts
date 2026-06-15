import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DeleteItemDto {
  @ApiProperty({ description: '删除密码' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ description: '删除原因' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkDeleteDto extends DeleteItemDto {
  @ApiProperty({ description: '资料 ID 列表', type: [String] })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
