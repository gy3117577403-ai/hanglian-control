import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import {
  CurrentUser,
  type AuthenticatedRequestUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompareDocumentsDto } from './dto/compare-documents.dto';
import { DocumentQueryDto } from './dto/document-query.dto';
import { DocumentVersionQueryDto } from './dto/document-version-query.dto';
import { FileHealthQueryDto } from './dto/file-health-query.dto';
import { SetEffectiveDocumentDto } from './dto/set-effective-document.dto';
import { UpdateDocumentStatusDto } from './dto/update-document-status.dto';
import { UpdateDocumentVersionDto } from './dto/update-document-version.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentFileAccessGuard } from './document-file-access.guard';
import { DOCUMENT_UPLOAD_MAX_BYTES, DocumentsService } from './documents.service';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Query document list.' })
  findAll(@Query() query: DocumentQueryDto) {
    return this.documentsService.findAll(query);
  }

  @Get('versions')
  @ApiOperation({ summary: 'Query product document version groups.' })
  findProductVersions(@Query() query: DocumentVersionQueryDto) {
    return this.documentsService.findProductVersions(query);
  }

  @Get('file-health')
  @ApiOperation({ summary: 'Check uploaded document file health.' })
  fileHealth(@Query() query: FileHealthQueryDto) {
    return this.documentsService.getFileHealth(query);
  }

  @Post('compare')
  @ApiOperation({ summary: 'Compare document metadata.' })
  compare(@Body() dto: CompareDocumentsDto) {
    return this.documentsService.compare(dto);
  }

  @Post('upload')
  @ApiOperation({
    summary: 'Upload a PDF or image document and bind it to a product or plan.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'file',
        'productId',
        'documentType',
        'title',
        'version',
        'requiredForProcess',
      ],
      properties: {
        file: { type: 'string', format: 'binary' },
        planId: { type: 'string' },
        productId: { type: 'string' },
        documentType: {
          type: 'string',
          enum: [
            'drawing_pdf',
            'sop_image',
            'connector_manual',
            'pinout_diagram',
            'finished_detail_image',
            'process_card',
          ],
        },
        title: { type: 'string' },
        version: { type: 'string', default: 'Rev.A' },
        status: {
          type: 'string',
          enum: ['effective', 'pending_review', 'expired', 'missing', 'inconsistent'],
          default: 'effective',
        },
        requiredForProcess: { type: 'string', enum: ['front', 'back', 'common'] },
        keywords: { type: 'string' },
        remark: { type: 'string' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: DOCUMENT_UPLOAD_MAX_BYTES },
    }),
  )
  upload(
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return this.documentsService.upload(dto, file, user);
  }

  @Get(':id/download')
  @UseGuards(DocumentFileAccessGuard)
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({ summary: 'Download the original document file.' })
  async download(@Param('id') id: string, @Res() response: Response) {
    const file = await this.documentsService.getDocumentFileStream(
      id,
      'attachment',
    );
    this.writeFileResponse(response, file, 'attachment');
  }

  @Get(':id/file')
  @UseGuards(DocumentFileAccessGuard)
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({ summary: 'Read the original document file.' })
  async file(@Param('id') id: string, @Res() response: Response) {
    const file = await this.documentsService.getDocumentFileStream(id, 'inline');
    this.writeFileResponse(response, file, 'inline');
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get all versions for the selected document group.' })
  findVersions(@Param('id') id: string) {
    return this.documentsService.findVersions(id);
  }

  @Post(':id/set-effective')
  @ApiOperation({ summary: 'Set a document version as effective.' })
  setEffective(
    @Param('id') id: string,
    @Body() dto: SetEffectiveDocumentDto,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return this.documentsService.setEffective(id, dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document detail.' })
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update document status.' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentStatusDto,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return this.documentsService.updateStatus(id, dto, user);
  }

  @Patch(':id/version')
  @ApiOperation({ summary: 'Update document version.' })
  updateVersion(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentVersionDto,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return this.documentsService.updateVersion(id, dto, user);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a document without deleting the file.' })
  archive(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return this.documentsService.archive(id, user);
  }

  private writeFileResponse(
    response: Response,
    file: Awaited<ReturnType<DocumentsService['getDocumentFileStream']>>,
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
