import { BadRequestException, Body, Controller, Get, Param, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CompleteOrderDto } from './dto/complete-order.dto';
import { ConnectorQueryDto } from './dto/connector-query.dto';
import { DrawingQueryDto } from './dto/drawing-query.dto';
import { FixtureQueryDto } from './dto/fixture-query.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { HubSearchQueryDto } from './dto/search-query.dto';
import { UploadDrawingItemDto } from './dto/upload-drawing-item.dto';
import { DocumentHubService } from './document-hub.service';
import type { DrawingModuleKey } from './mock/document-hub.seed';
import { DeleteItemDto } from '../unified-documents/dto/delete-item.dto';

const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

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

  @Get('drawings/customers/:customerId/products')
  @ApiOperation({ summary: '图纸库第二层：客户下产品型号列表' })
  getProducts(@Param('customerId') customerId: string, @Query() query: DrawingQueryDto) {
    return this.documentHubService.getProducts(customerId, query);
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

  @Get('connectors/:id')
  @ApiOperation({ summary: '连接器参数详情' })
  getConnector(@Param('id') id: string) {
    return this.documentHubService.getConnector(id);
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
