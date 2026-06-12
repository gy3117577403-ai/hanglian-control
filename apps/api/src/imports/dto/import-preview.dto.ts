import { ApiProperty } from '@nestjs/swagger';

export class ImportPreviewUploadDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Excel 或 CSV 文件' })
  file!: Express.Multer.File;
}
