import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class ShiftHandoverDto {
  @ApiProperty({ example: 'A班' })
  @IsString()
  fromTeam!: string;

  @ApiProperty({ example: 'B班' })
  @IsString()
  toTeam!: string;

  @ApiProperty({ example: ['PLN-20260611-001'] })
  @IsArray()
  @IsString({ each: true })
  planIds!: string[];

  @ApiProperty({ example: '交接说明' })
  @IsString()
  summary!: string;

  @ApiPropertyOptional({ example: ['孔位图待复核'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  riskItems?: string[];

  @ApiPropertyOptional({ example: ['B2 工位继续完成尾数'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  unfinishedItems?: string[];

  @ApiPropertyOptional({ example: 'mock-front-leader' })
  @IsOptional()
  @IsString()
  operatorId?: string;

  @ApiPropertyOptional({ example: '前段组长演示' })
  @IsOptional()
  @IsString()
  operatorName?: string;

  @ApiPropertyOptional({ example: '前段组长' })
  @IsOptional()
  @IsString()
  operatorRole?: string;
}
