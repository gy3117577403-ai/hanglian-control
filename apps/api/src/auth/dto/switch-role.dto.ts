import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SwitchRoleDto {
  @ApiProperty({ example: 'mock-maintainer', description: '目标 Mock 用户 ID' })
  @IsString()
  userId!: string;
}
