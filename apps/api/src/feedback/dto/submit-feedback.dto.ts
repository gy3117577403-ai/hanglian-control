import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitFeedbackDto {
  @ApiProperty({ example: 'PLN-20260611-001', description: '生产计划 ID' })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({
    example: '资料缺失',
    enum: ['资料缺失', '版本异常', '参数不一致', '图纸不清晰', 'SOP 与现场不符', '其他'],
    description: '异常类型',
  })
  @IsIn(['资料缺失', '版本异常', '参数不一致', '图纸不清晰', 'SOP 与现场不符', '其他'])
  type: string;

  @ApiProperty({ example: 'SOP 与现场夹具方向不一致', required: false, description: '异常说明' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'demo-leader', description: '提交人用户 ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: '组长演示账号', description: '提交人姓名' })
  @IsString()
  @IsNotEmpty()
  userName: string;
}
