import { Controller, Get, Header, Param, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentFileAccessGuard } from '../documents/document-file-access.guard';
import { FilesService } from './files.service';

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('documents/:documentId/preview')
  @UseGuards(DocumentFileAccessGuard)
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({ summary: 'Preview an uploaded document file.' })
  async previewDocument(
    @Param('documentId') documentId: string,
    @Res() response: Response,
  ) {
    const file = await this.filesService.getDocumentFile(
      documentId,
      'document_previewed',
    );
    this.writeFileResponse(response, file, 'inline');
  }

  @Get('documents/:documentId/download')
  @UseGuards(DocumentFileAccessGuard)
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({ summary: 'Download an uploaded document file.' })
  async downloadDocument(
    @Param('documentId') documentId: string,
    @Res() response: Response,
  ) {
    const file = await this.filesService.getDocumentFile(
      documentId,
      'document_downloaded',
    );
    this.writeFileResponse(response, file, 'attachment');
  }

  @Get(':documentId')
  @UseGuards(DocumentFileAccessGuard)
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({ summary: 'Read a document file by documentId.' })
  async getFile(
    @Param('documentId') documentId: string,
    @Res() response: Response,
  ) {
    const file = await this.filesService.getFile(documentId);
    this.writeFileResponse(response, file, 'inline');
  }

  private writeFileResponse(
    response: Response,
    file: Awaited<ReturnType<FilesService['getFile']>>,
    disposition: 'inline' | 'attachment',
  ) {
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Length', String(file.fileSize));
    response.setHeader(
      'Content-Disposition',
      contentDisposition(disposition, file.fileName),
    );
    file.stream.pipe(response);
  }
}

function contentDisposition(
  disposition: 'inline' | 'attachment',
  fileName: string,
) {
  const safeAsciiName =
    fileName.replace(/[^\x20-\x7e]|[\\/"<>|:*?\r\n]/g, '_').slice(0, 180) ||
    'document';
  return `${disposition}; filename="${safeAsciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
