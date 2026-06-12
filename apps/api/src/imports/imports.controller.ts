import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { ImportApplyDto } from './dto/import-apply.dto';
import { ImportPreviewUploadDto } from './dto/import-preview.dto';
import { ImportHistoryQueryDto } from './dto/import-query.dto';
import { ImportsService } from './imports.service';

const allowedMimeTypes = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
  'text/plain',
];

@ApiTags('imports')
@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Get('templates')
  @ApiOperation({ summary: '获取支持的导入模板类型和字段说明' })
  templates() {
    return this.importsService.getTemplates();
  }

  @Get('templates/:type/download')
  @ApiOperation({ summary: '下载指定导入类型的 Excel 模板' })
  @ApiParam({ name: 'type', enum: ['production_plan', 'customer_product', 'front_parameter', 'back_package'] })
  async downloadTemplate(@Param('type') type: string, @Res({ passthrough: true }) response: Response) {
    const buffer = await this.importsService.createTemplateWorkbook(type);
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(type)}-template.xlsx"`);
    return new StreamableFile(Buffer.from(buffer as ArrayBuffer));
  }

  @Post(':type/preview')
  @ApiOperation({ summary: '上传 Excel / CSV 并生成导入预览，不真正写入业务数据' })
  @ApiParam({ name: 'type', enum: ['production_plan', 'customer_product', 'front_parameter', 'back_package'] })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ImportPreviewUploadDto })
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      const lowerName = file.originalname.toLowerCase();
      if (!allowedMimeTypes.includes(file.mimetype) && !/\.(xlsx|xls|csv)$/.test(lowerName)) {
        callback(new BadRequestException('仅支持 Excel 或 CSV 导入文件。'), false);
        return;
      }
      callback(null, true);
    },
  }))
  preview(@Param('type') type: string, @UploadedFile() file?: Express.Multer.File) {
    return this.importsService.preview(type, file);
  }

  @Post(':type/apply')
  @ApiOperation({ summary: '应用导入预览结果，写入本地 Mock / metadata 数据源' })
  @ApiParam({ name: 'type', enum: ['production_plan', 'customer_product', 'front_parameter', 'back_package'] })
  apply(@Param('type') type: string, @Body() dto: ImportApplyDto) {
    return this.importsService.apply(type, dto);
  }

  @Get('history')
  @ApiOperation({ summary: '查询导入历史' })
  history(@Query() query: ImportHistoryQueryDto) {
    return this.importsService.history(query);
  }

  @Get('history/:id')
  @ApiOperation({ summary: '查询导入历史详情' })
  historyDetail(@Param('id') id: string) {
    return this.importsService.historyDetail(id);
  }

  @Post('history/:id/rollback-preview')
  @ApiOperation({ summary: '只生成导入记录回滚预览，不真正回滚或删除数据' })
  rollbackPreview(@Param('id') id: string) {
    return this.importsService.rollbackPreview(id);
  }
}
