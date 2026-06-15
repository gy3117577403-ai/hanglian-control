import { IsOptional, IsString } from 'class-validator';

export class ConnectorQueryDto {
  @IsOptional()
  @IsString()
  q?: string;
}
