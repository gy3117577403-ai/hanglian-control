import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ConfirmProductionPlanDto {
  @ApiProperty({ example: 'demo-leader', description: '确认人用户 ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: '组长演示账号', description: '确认人姓名' })
  @IsString()
  @IsNotEmpty()
  userName: string;

  @ApiProperty({ example: '前段组长', enum: ['前段组长', '后段组长'], description: '确认人角色' })
  @IsIn(['前段组长', '后段组长'])
  role: '前段组长' | '后段组长';
}
