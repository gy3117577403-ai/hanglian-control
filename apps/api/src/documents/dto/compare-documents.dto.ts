import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

export class CompareDocumentsDto {
  @ApiProperty({ description: '需要对比的资料 ID 列表', type: [String] })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  documentIds!: string[];
}
