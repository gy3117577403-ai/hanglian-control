import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsIn, IsOptional } from 'class-validator';

export class ConsistencyQueryDto {
  @ApiPropertyOptional({ description: '检查范围', enum: ['all', 'plans', 'documents', 'knowledge', 'execution'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'plans', 'documents', 'knowledge', 'execution'])
  scope?: 'all' | 'plans' | 'documents' | 'knowledge' | 'execution' = 'all';

  @ApiPropertyOptional({ description: '是否包含本地 metadata 记录', default: true })
  @IsOptional()
  @IsBooleanString()
  includeMetadata?: string = 'true';
}
