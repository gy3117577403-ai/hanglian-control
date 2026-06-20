import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CompleteOrderDto } from './dto/complete-order.dto';
import { ConnectorQueryDto } from './dto/connector-query.dto';
import { CreateConnectorParameterDto } from './dto/create-connector-parameter.dto';
import { CreateDrawingCustomerDto } from './dto/create-drawing-customer.dto';
import { CreateDrawingProductDto } from './dto/create-drawing-product.dto';
import { DrawingQueryDto } from './dto/drawing-query.dto';
import { FixtureQueryDto } from './dto/fixture-query.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { HubSearchQueryDto } from './dto/search-query.dto';
import { PdfImportPreviewFormDto } from './dto/pdf-import.dto';
import { UpdateConnectorParameterDto } from './dto/update-connector-parameter.dto';
import { UpdateDrawingCustomerDto } from './dto/update-drawing-customer.dto';
import { UpdateDrawingProductDto } from './dto/update-drawing-product.dto';
import { UploadDrawingItemDto } from './dto/upload-drawing-item.dto';
import { DocumentHubService } from './document-hub.service';
import type { DrawingModuleKey } from './mock/document-hub.seed';
import { DeleteItemDto } from '../unified-documents/dto/delete-item.dto';

const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const allowedConnectorImportMimeTypes = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream',
];

type PdfImportUploadedFiles = {
  files?: Express.Multer.File[];
  file?: Express.Multer.File[];
};

function normalizeConnectorImportStrategy(value?: string | boolean): 'review' | 'skip' | 'overwrite' {
  if (value === true || value === 'true' || value === '1' || value === 'overwrite') return 'overwrite';
  if (value === 'skip') return 'skip';
  return 'review';
}

@ApiTags('document-hub')
@Controller('document-hub')
export class DocumentHubController {
  constructor(private readonly documentHubService: DocumentHubService) {}

  @Get('orders')
  @ApiOperation({ summary: '查询今日 / 本周订单 Mock 数据' })
  getOrders(@Query() query: OrderQueryDto) {
    return this.documentHubService.getOrders(query.scope ?? 'today', query.includeCompleted);
  }

  @Post('orders/:orderId/complete')
  @ApiOperation({ summary: '将订单标记为完成，仅内存 Mock 状态' })
  completeOrder(@Param('orderId') orderId: string, @Body() dto: CompleteOrderDto) {
    return this.documentHubService.completeOrder(orderId, dto.completedBy);
  }

  @Get('orders/overview')
  @ApiOperation({ summary: '订单总览：本周 / 待完成 / 已完成' })
  getOrderOverview() {
    return this.documentHubService.getOrderOverview();
  }

  @Get('drawings/customers')
  @ApiOperation({ summary: '图纸库第一层：客户列表' })
  getCustomers(@Query() query: DrawingQueryDto) {
    return this.documentHubService.getCustomers(query);
  }

  @Post('drawings/customers')
  @ApiOperation({ summary: '新增图纸客户' })
  createDrawingCustomer(@Body() dto: CreateDrawingCustomerDto) {
    return this.documentHubService.createDrawingCustomer(dto);
  }

  @Patch('drawings/customers/:customerId')
  @ApiOperation({ summary: '修改图纸客户' })
  updateDrawingCustomer(@Param('customerId') customerId: string, @Body() dto: UpdateDrawingCustomerDto) {
    return this.documentHubService.updateDrawingCustomer(customerId, dto);
  }

  @Get('drawings/customers/:customerId/products')
  @ApiOperation({ summary: '图纸库第二层：客户下产品型号列表' })
  getProducts(@Param('customerId') customerId: string, @Query() query: DrawingQueryDto) {
    return this.documentHubService.getProducts(customerId, query);
  }

  @Post('drawings/products')
  @ApiOperation({ summary: '新增图纸产品' })
  createDrawingProduct(@Body() dto: CreateDrawingProductDto) {
    return this.documentHubService.createDrawingProduct(dto);
  }

  @Patch('drawings/products/:productId')
  @ApiOperation({ summary: '修改图纸产品' })
  updateDrawingProduct(@Param('productId') productId: string, @Body() dto: UpdateDrawingProductDto) {
    return this.documentHubService.updateDrawingProduct(productId, dto);
  }

  @Post('drawings/pdf-import/preview')
  @ApiOperation({ summary: 'PDF 图纸批量导入 Preview' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['customerId', 'files'],
      properties: {
        customerId: { type: 'string', description: '已有图纸客户 ID' },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: '一个或多个 PDF 文件，主字段名为 files',
        },
        file: { type: 'string', format: 'binary', description: '兼容单文件字段' },
      },
    },
  })
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'files', maxCount: 51 },
    { name: 'file', maxCount: 51 },
  ], { storage: memoryStorage() }))
  previewPdfImport(
    @Body() dto: PdfImportPreviewFormDto,
    @UploadedFiles() uploadedFiles?: PdfImportUploadedFiles,
  ) {
    const files = [
      ...(uploadedFiles?.files ?? []),
      ...(uploadedFiles?.file ?? []),
    ];
    return this.documentHubService.previewPdfImport(dto, files);
  }

  @Get('drawings/pdf-import/:importBatchId')
  @ApiOperation({ summary: '读取 PDF 导入 Preview 记录' })
  getPdfImportPreview(@Param('importBatchId') importBatchId: string) {
    return this.documentHubService.getPdfImportPreview(importBatchId);
  }

  @Get('drawings/products/by-model/:productModel')
  @ApiOperation({ summary: '按订单产品型号打开图纸详情' })
  getProductByModel(@Param('productModel') productModel: string) {
    return this.documentHubService.getProductByModel(productModel);
  }

  @Get('drawings/products/:productId')
  @ApiOperation({ summary: '图纸库第三层：产品图纸详情' })
  getProduct(@Param('productId') productId: string) {
    return this.documentHubService.getProduct(productId);
  }

  @Get('drawings/products/:productId/modules/:moduleKey')
  @ApiOperation({ summary: '图纸库第四层：模块资料详情' })
  getModule(@Param('productId') productId: string, @Param('moduleKey') moduleKey: DrawingModuleKey) {
    return this.documentHubService.getModule(productId, moduleKey);
  }

  @Post('drawings/products/:productId/modules/:moduleKey/upload')
  @ApiOperation({ summary: '模块内上传资料，仅内存 Mock 写入，不连接数据库' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'title', 'version'],
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        version: { type: 'string' },
        customerId: { type: 'string' },
        productId: { type: 'string' },
        moduleKey: { type: 'string' },
        remark: { type: 'string' },
        keywords: { type: 'string' },
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
  uploadDrawingItem(
    @Param('productId') productId: string,
    @Param('moduleKey') moduleKey: DrawingModuleKey,
    @Body() dto: UploadDrawingItemDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.documentHubService.uploadDrawingItem(productId, moduleKey, dto, file);
  }

  @Post('drawings/products/:productId/modules/:moduleKey/items/:itemId/delete')
  @ApiOperation({ summary: '删除主页面资料库本地上传项，校验删除密码并清理本地文件' })
  deleteDrawingItem(
    @Param('productId') productId: string,
    @Param('moduleKey') moduleKey: DrawingModuleKey,
    @Param('itemId') itemId: string,
    @Body() dto: DeleteItemDto,
  ) {
    return this.documentHubService.deleteDrawingItem(productId, moduleKey, itemId, dto);
  }

  @Get('connectors')
  @ApiOperation({ summary: '连接器参数独立搜索列表' })
  getConnectors(@Query() query: ConnectorQueryDto) {
    return this.documentHubService.getConnectors(query);
  }

  @Post('connectors')
  @ApiOperation({ summary: '新增连接器工艺参数，当前仅内存 Mock' })
  createConnector(@Body() dto: CreateConnectorParameterDto) {
    return this.documentHubService.createConnector(dto);
  }

  @Post('connectors/import')
  @ApiOperation({ summary: 'Excel 导入连接器工艺参数，当前仅内存 Mock' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        overwrite: { type: 'string', example: 'false' },
        duplicateStrategy: { type: 'string', enum: ['review', 'skip', 'overwrite'], example: 'review' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      if (!allowedConnectorImportMimeTypes.includes(file.mimetype)) {
        callback(new BadRequestException('仅允许导入 Excel 文件'), false);
        return;
      }
      callback(null, true);
    },
  }))
  importConnectors(@UploadedFile() file?: Express.Multer.File, @Body() body?: { overwrite?: string | boolean; duplicateStrategy?: string }): Promise<unknown> {
    const duplicateStrategy = body?.duplicateStrategy ?? body?.overwrite;
    return this.documentHubService.importConnectors(file, normalizeConnectorImportStrategy(duplicateStrategy));
  }

  @Get('connectors/:id')
  @ApiOperation({ summary: '连接器参数详情' })
  getConnector(@Param('id') id: string) {
    return this.documentHubService.getConnector(id);
  }

  @Patch('connectors/:id')
  @ApiOperation({ summary: '更新连接器参数备注或长度参数，当前仅内存 Mock' })
  updateConnector(@Param('id') id: string, @Body() dto: UpdateConnectorParameterDto) {
    return this.documentHubService.updateConnector(id, dto);
  }

  @Delete('connectors/:id')
  @ApiOperation({ summary: '删除连接器工艺参数，当前仅内存 Mock' })
  deleteConnector(@Param('id') id: string) {
    return this.documentHubService.deleteConnector(id);
  }

  @Get('fixtures')
  @ApiOperation({ summary: '治具参数独立搜索列表' })
  getFixtures(@Query() query: FixtureQueryDto) {
    return this.documentHubService.getFixtures(query);
  }

  @Get('fixtures/:id')
  @ApiOperation({ summary: '治具参数详情' })
  getFixture(@Param('id') id: string) {
    return this.documentHubService.getFixture(id);
  }

  @Get('search')
  @ApiOperation({ summary: '当前功能范围搜索：drawing / connector / fixture' })
  search(@Query() query: HubSearchQueryDto) {
    return this.documentHubService.search(query);
  }
}
