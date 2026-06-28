import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { BulkDeleteDto, DeleteItemDto } from './dto/delete-item.dto';
import { DeleteLockChangeDto, DeleteLockSetupDto, DeleteLockVerifyDto } from './dto/delete-lock.dto';
import { BulkPurgeDto, PurgeItemDto } from './dto/purge-item.dto';
import { BulkRestoreDto, RestoreItemDto } from './dto/restore-item.dto';
import { UnifiedSearchDto } from './dto/unified-search.dto';
import { UnifiedUploadDto } from './dto/unified-upload.dto';
import { UpdateUnifiedItemDto } from './dto/update-unified-item.dto';
import { DeleteLockService } from './helpers/delete-lock.service';
import { UnifiedDocumentsService } from './unified-documents.service';

const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

@ApiTags('unified-documents')
@Controller('unified-documents')
export class UnifiedDocumentsController {
  constructor(private readonly unifiedDocumentsService: UnifiedDocumentsService) {}

  @Get('search')
  @ApiOperation({ summary: '统一资料搜索，覆盖图纸、SOP、孔位图、成品图、连接器、治具、异常和质量标准' })
  search(@Query() query: UnifiedSearchDto) {
    return this.unifiedDocumentsService.search(query);
  }

  @Get('trash')
  @ApiOperation({ summary: '查询回收站资料' })
  trash() {
    return this.unifiedDocumentsService.trash();
  }

  @Post('upload')
  @ApiOperation({ summary: '统一资料上传，不要求登录，仅使用本地操作员审计' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'productCode', 'productName', 'documentType', 'title', 'version'],
      properties: {
        file: { type: 'string', format: 'binary' },
        customerName: { type: 'string' },
        productCode: { type: 'string' },
        productName: { type: 'string' },
        productVersion: { type: 'string' },
        documentType: { type: 'string', enum: ['drawing_pdf', 'sop_image', 'connector_manual', 'pinout_diagram', 'finished_detail_image', 'process_card'] },
        title: { type: 'string' },
        version: { type: 'string' },
        status: { type: 'string', enum: ['effective', 'pending_review', 'expired', 'missing', 'inconsistent'] },
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
  upload(@Body() dto: UnifiedUploadDto, @UploadedFile() file?: Express.Multer.File) {
    return this.unifiedDocumentsService.upload(dto, file);
  }

  @Post('bulk-delete')
  @ApiOperation({ summary: '批量移入回收站，必须验证删除密码' })
  bulkDelete(@Body() dto: BulkDeleteDto) {
    return this.unifiedDocumentsService.bulkDelete(dto);
  }

  @Post('bulk-restore')
  @ApiOperation({ summary: '批量恢复资料' })
  bulkRestore(@Body() dto: BulkRestoreDto) {
    return this.unifiedDocumentsService.bulkRestore(dto);
  }

  @Post('bulk-purge')
  @ApiOperation({ summary: '批量彻底删除，必须验证删除密码并输入确认文本' })
  bulkPurge(@Body() dto: BulkPurgeDto) {
    return this.unifiedDocumentsService.bulkPurge(dto);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: '查询资料版本历史' })
  versions(@Param('id') id: string) {
    return this.unifiedDocumentsService.versions(id);
  }

  @Post(':id/set-effective')
  @ApiOperation({ summary: '设为当前有效版本，不再按角色限制' })
  setEffective(@Param('id') id: string) {
    return this.unifiedDocumentsService.setEffective(id);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询统一资料详情' })
  findOne(@Param('id') id: string) {
    return this.unifiedDocumentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '编辑本地上传资料信息' })
  update(@Param('id') id: string, @Body() dto: UpdateUnifiedItemDto) {
    return this.unifiedDocumentsService.update(id, dto);
  }

  @Post(':id/delete')
  @ApiOperation({ summary: '移入回收站，必须验证删除密码' })
  delete(@Param('id') id: string, @Body() dto: DeleteItemDto) {
    return this.unifiedDocumentsService.delete(id, dto);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: '从回收站恢复资料' })
  restore(@Param('id') id: string, @Body() dto: RestoreItemDto) {
    return this.unifiedDocumentsService.restore(id, dto);
  }

  @Post(':id/purge')
  @ApiOperation({ summary: '彻底删除资料与白名单 uploads 内本地文件，必须验证删除密码' })
  purge(@Param('id') id: string, @Body() dto: PurgeItemDto) {
    return this.unifiedDocumentsService.purge(id, dto);
  }
}

@ApiTags('delete-lock')
@Controller('delete-lock')
export class DeleteLockController {
  constructor(private readonly deleteLockService: DeleteLockService) {}

  @Get('status')
  @ApiOperation({ summary: '查询删除锁状态，不返回 hash' })
  status() {
    return this.deleteLockService.status();
  }

  @Post('setup')
  @ApiOperation({ summary: '设置删除密码，仅保存 bcrypt hash' })
  setup(@Body() dto: DeleteLockSetupDto) {
    return this.deleteLockService.setup(dto.password, dto.confirmPassword);
  }

  @Post('verify')
  @ApiOperation({ summary: '验证删除密码，仅返回 true / false' })
  verify(@Body() dto: DeleteLockVerifyDto) {
    return this.deleteLockService.verify(dto.password);
  }

  @Post('change')
  @ApiOperation({ summary: '修改删除密码' })
  change(@Body() dto: DeleteLockChangeDto) {
    return this.deleteLockService.change(dto.oldPassword, dto.password, dto.confirmPassword, dto.updatedBy);
  }
}
