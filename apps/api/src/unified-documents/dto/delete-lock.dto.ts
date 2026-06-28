import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class DeleteLockSetupDto {
  @ApiProperty({ description: '删除密码，至少 6 位' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: '确认删除密码' })
  @IsString()
  @MinLength(6)
  confirmPassword: string;
}

export class DeleteLockVerifyDto {
  @ApiProperty({ description: '用户输入的删除密码' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class DeleteLockChangeDto {
  @ApiProperty({ description: '旧删除密码' })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({ description: '新删除密码，至少 6 位' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: '确认新删除密码' })
  @IsString()
  @MinLength(6)
  confirmPassword: string;

  @ApiPropertyOptional({ description: '操作人' })
  @IsOptional()
  @IsString()
  updatedBy?: string;
}
