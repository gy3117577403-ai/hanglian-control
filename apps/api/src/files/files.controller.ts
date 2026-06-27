import { Controller, Get, Header, Param, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { DocumentFileAccessGuard } from '../documents/document-file-access.guard';
import { FilesService } from './files.service';

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get(':documentId')
  @UseGuards(DocumentFileAccessGuard)
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({ summary: 'Read a document file by documentId. Prefer /documents/:id/file.' })
  async getFile(@Param('documentId') documentId: string, @Res() response: Response) {
    const file = await this.filesService.getFile(documentId);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Length', String(file.fileSize));
    response.setHeader('Content-Disposition', contentDisposition('inline', file.fileName));
    file.stream.pipe(response);
  }
}

function contentDisposition(disposition: 'inline' | 'attachment', fileName: string) {
  const safeAsciiName = fileName.replace(/[^\x20-\x7e]|[\\/"<>|:*?\r\n]/g, '_').slice(0, 180) || 'document';
  return `${disposition}; filename="${safeAsciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
