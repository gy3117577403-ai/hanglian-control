import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { FilesService } from './files.service';

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get(':storedFileName')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({ summary: '读取本地上传文件流，仅允许 storage/uploads 内文件' })
  async getFile(@Param('storedFileName') storedFileName: string, @Res() response: Response) {
    const file = await this.filesService.getFile(storedFileName);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Length', file.size);
    response.setHeader('Content-Disposition', `inline; filename="${storedFileName}"`);
    file.stream.pipe(response);
  }
}
