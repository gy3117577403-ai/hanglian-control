import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { FilesService } from './files.service';

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get(':storedFileName')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({ summary: '读取本地上传文件流，仅允许 storage/uploads 内的安全文件名。' })
  @ApiOkResponse({ description: '返回可在线预览或下载的文件流。' })
  @ApiNotFoundResponse({ description: '文件不存在或文件名非法。' })
  async getFile(@Param('storedFileName') storedFileName: string, @Res() response: Response) {
    const file = await this.filesService.getFile(storedFileName);
    const safeFileName = storedFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Length', String(file.size));
    response.setHeader('Content-Disposition', `inline; filename="${safeFileName}"; filename*=UTF-8''${encodeURIComponent(safeFileName)}`);
    file.stream.pipe(response);
  }
}
