import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class DictionaryItemDto {
  @ApiProperty() @IsString() @MaxLength(60) key!: string;
  @ApiProperty() @IsString() @MaxLength(80) label!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() required?: boolean;
  @ApiProperty() @IsBoolean() enabled!: boolean;
  @ApiProperty() @IsNumber() sort!: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(160) remark?: string;
}

export class UpdateDictionaryDto {
  @ApiProperty({ type: [DictionaryItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DictionaryItemDto)
  items!: DictionaryItemDto[];
}
