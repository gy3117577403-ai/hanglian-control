import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class MockLoginDto {
  @ApiProperty({ example: 'mock-front-leader', description: 'Mock 用户 ID' })
  @IsString()
  userId!: string;
}
