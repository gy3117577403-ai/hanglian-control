import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class UpdateOrderProductionStatusDto {
  @ApiProperty({
    example: '生产中',
    enum: ['待生产', '生产中', '已完成', '异常'],
    required: false,
  })
  @IsOptional()
  @IsIn(['待生产', '生产中', '已完成', '异常'])
  status?: '待生产' | '生产中' | '已完成' | '异常';

  @ApiProperty({
    example: '生产中',
    enum: ['待生产', '生产中', '已完成', '异常'],
    required: false,
    description: 'ArkTS 端可使用的状态字段别名',
  })
  @IsOptional()
  @IsIn(['待生产', '生产中', '已完成', '异常'])
  productionStatus?: '待生产' | '生产中' | '已完成' | '异常';
}
