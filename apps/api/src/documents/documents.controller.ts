import { BadRequestException, Body, Controller, Get, Header, Param, ParseIntPipe, Patch, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { CompareDocumentsDto } from './dto/compare-documents.dto';
import { DocumentQueryDto } from './dto/document-query.dto';
import { DocumentVersionQueryDto } from './dto/document-version-query.dto';
import { SetEffectiveDocumentDto } from './dto/set-effective-document.dto';
import { UpdateDocumentStatusDto } from './dto/update-document-status.dto';
import { UpdateDocumentVersionDto } from './dto/update-document-version.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentsService } from './documents.service';
import { PdfPreviewService } from './pdf-preview.service';

const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly pdfPreviewService: PdfPreviewService,
  ) {}

  @Get()
  @ApiOperation({ summary: '查询资料列表，包含 seed 资料和本地上传资料' })
  findAll(@Query() query: DocumentQueryDto) {
    return this.documentsService.findAll(query);
  }

  @Get('versions')
  @ApiOperation({ summary: '查询某产品的资料版本分组列表' })
  findProductVersions(@Query() query: DocumentVersionQueryDto) {
    return this.documentsService.findProductVersions(query);
  }

  @Post('compare')
  @ApiOperation({ summary: '对比两个或多个资料版本的元数据，不比较 PDF 或图片内容' })
  compare(@Body() dto: CompareDocumentsDto) {
    return this.documentsService.compare(dto);
  }

  @Post('upload')
  @ApiOperation({ summary: '上传本地资料文件并绑定产品或计划' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'productId', 'documentType', 'title', 'version', 'requiredForProcess'],
      properties: {
        file: { type: 'string', format: 'binary' },
        planId: { type: 'string' },
        productId: { type: 'string' },
        documentType: { type: 'string', enum: ['drawing_pdf', 'sop_image', 'connector_manual', 'pinout_diagram', 'finished_detail_image', 'process_card'] },
        title: { type: 'string' },
        version: { type: 'string', default: 'Rev.A' },
        status: { type: 'string', enum: ['effective', 'pending_review', 'expired', 'missing', 'inconsistent'], default: 'effective' },
        requiredForProcess: { type: 'string', enum: ['front', 'back', 'common'] },
        keywords: { type: 'string' },
        remark: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 30 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        callback(new BadRequestException('仅允许上传 PDF、JPG、PNG、WEBP 文件。'), false);
        return;
      }
      callback(null, true);
    },
  }))
  upload(@Body() dto: UploadDocumentDto, @UploadedFile() file?: Express.Multer.File) {
    return this.documentsService.upload(dto, file);
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Get document image preview pages for ArkTS rendering' })
  preview(@Param('id') id: string) {
    return this.pdfPreviewService.getPreview(id);
  }

  @Get(':id/preview-pages/:pageNo')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({ summary: 'Read one generated preview page image' })
  async previewPage(
    @Param('id') id: string,
    @Param('pageNo', ParseIntPipe) pageNo: number,
    @Res() response: Response,
  ) {
    const page = await this.pdfPreviewService.getPreviewPageFile(id, pageNo);
    response.setHeader('Content-Type', page.mimeType);
    response.setHeader('Content-Length', page.size);
    response.setHeader('Content-Disposition', `inline; filename="${page.fileName}"`);
    page.stream.pipe(response);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: '获取当前资料所属分组的所有版本' })
  findVersions(@Param('id') id: string) {
    return this.documentsService.findVersions(id);
  }

  @Post(':id/set-effective')
  @ApiOperation({ summary: '将某个资料版本设置为当前有效版本，并使同组其他有效版本失效' })
  setEffective(@Param('id') id: string, @Body() dto: SetEffectiveDocumentDto) {
    return this.documentsService.setEffective(id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个资料详情' })
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '更新资料状态' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateDocumentStatusDto) {
    return this.documentsService.updateStatus(id, dto);
  }

  @Patch(':id/version')
  @ApiOperation({ summary: '更新资料版本号' })
  updateVersion(@Param('id') id: string, @Body() dto: UpdateDocumentVersionDto) {
    return this.documentsService.updateVersion(id, dto);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: '归档资料，不物理删除文件' })
  archive(@Param('id') id: string) {
    return this.documentsService.archive(id);
  }
}
