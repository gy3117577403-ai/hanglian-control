import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class KnowledgeLinkQueryDto {
  @ApiPropertyOptional({ enum: ['front', 'back', 'common'] })
  @IsOptional()
  @IsIn(['front', 'back', 'common'])
  processSegment?: 'front' | 'back' | 'common';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}

