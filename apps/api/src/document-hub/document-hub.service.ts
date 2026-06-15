import { Injectable, NotFoundException } from '@nestjs/common';
import { ConnectorQueryDto } from './dto/connector-query.dto';
import { DrawingQueryDto } from './dto/drawing-query.dto';
import { FixtureQueryDto } from './dto/fixture-query.dto';
import { HubSearchQueryDto } from './dto/search-query.dto';
import { UploadDrawingItemDto } from './dto/upload-drawing-item.dto';
import {
  ConnectorParameter,
  DrawingItem,
  DrawingModuleKey,
  FixtureParameter,
  HubOrder,
  ProductDrawingDetail,
  connectorParameters,
  drawingDetails,
  fixtureParameters,
  hubCustomers,
  hubOrders,
  hubProducts,
} from './mock/document-hub.seed';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function includes(value: unknown, q: string) {
  return String(value ?? '').toLowerCase().includes(q);
}

function parseBoolean(value?: string) {
  return value === 'true' || value === '1';
}

@Injectable()
export class DocumentHubService {
  private readonly orders: HubOrder[] = clone(hubOrders);
  private readonly drawingDetails: ProductDrawingDetail[] = clone(drawingDetails);
  private readonly connectors: ConnectorParameter[] = clone(connectorParameters);
  private readonly fixtures: FixtureParameter[] = clone(fixtureParameters);

  getOrders(scope: 'today' | 'week' | 'all' = 'today', includeCompleted?: string) {
    const shouldIncludeCompleted = parseBoolean(includeCompleted);
    return this.orders.filter((order) => {
      const scopeMatched = scope === 'all' || order.scope === scope;
      const completedMatched = shouldIncludeCompleted || !order.completed;
      return scopeMatched && completedMatched;
    });
  }

  completeOrder(orderId: string, completedBy = 'local-operator') {
    const order = this.orders.find((item) => item.orderId === orderId);
    if (!order) throw new NotFoundException('订单不存在。');
    order.completed = true;
    order.completedAt = new Date().toISOString();
    order.remark = order.remark ? `${order.remark} / ${completedBy} 已完成` : `${completedBy} 已完成`;
    return order;
  }

  getOrderOverview() {
    const weekOrders = this.orders.filter((order) => order.scope === 'week');
    return {
      weekOrders,
      pendingOrders: this.orders.filter((order) => !order.completed),
      completedOrders: this.orders.filter((order) => order.completed),
      summary: {
        weekTotal: weekOrders.length,
        pendingTotal: this.orders.filter((order) => !order.completed).length,
        completedTotal: this.orders.filter((order) => order.completed).length,
      },
    };
  }

  getCustomers(query?: DrawingQueryDto) {
    const q = query?.q?.trim().toLowerCase();
    if (!q) return hubCustomers;
    return hubCustomers.filter((customer) => includes(customer.customerName, q) || includes(customer.customerShortName, q));
  }

  getProducts(customerId: string, query?: DrawingQueryDto) {
    const q = query?.q?.trim().toLowerCase();
    return hubProducts.filter((product) => {
      const customerMatched = product.customerId === customerId;
      const queryMatched = !q || [product.productModel, product.productName, product.remark].some((value) => includes(value, q));
      return customerMatched && queryMatched;
    });
  }

  getProduct(productId: string) {
    const detail = this.drawingDetails.find((item) => item.product.productId === productId);
    if (!detail) throw new NotFoundException('产品图纸资料不存在。');
    return detail;
  }

  getProductByModel(productModel: string) {
    const product = hubProducts.find((item) => item.productModel === productModel);
    if (!product) return null;
    return this.getProduct(product.productId);
  }

  getModule(productId: string, moduleKey: DrawingModuleKey) {
    const detail = this.getProduct(productId);
    const module = detail.modules.find((item) => item.moduleKey === moduleKey);
    if (!module) throw new NotFoundException('图纸模块不存在。');
    return {
      product: detail.product,
      customer: detail.customer,
      module,
    };
  }

  uploadDrawingItem(productId: string, moduleKey: DrawingModuleKey, dto: UploadDrawingItemDto, file?: Express.Multer.File) {
    const detail = this.getProduct(productId);
    const module = detail.modules.find((item) => item.moduleKey === moduleKey);
    if (!module) throw new NotFoundException('图纸模块不存在。');
    const fileType = this.resolveFileType(file?.mimetype);
    const nextItem: DrawingItem = {
      itemId: `manual-${Date.now()}`,
      title: dto.title,
      fileType,
      fileName: file?.originalname ?? `${dto.title}.${fileType === 'pdf' ? 'pdf' : 'png'}`,
      version: dto.version,
      remark: dto.remark || '模块内手动补充资料，当前仅为内存 Mock。',
      uploadedAt: new Date().toISOString(),
      source: 'manual_upload',
    };
    module.items.unshift(nextItem);
    module.status = 'uploaded';
    module.updatedAt = nextItem.uploadedAt;
    return {
      success: true,
      item: nextItem,
      module,
      product: detail.product,
    };
  }

  getConnectors(query?: ConnectorQueryDto) {
    const q = query?.q?.trim().toLowerCase();
    if (!q) return this.connectors;
    return this.connectors.filter((item) => [
      item.connectorModel,
      item.terminalModel,
      item.pinCount,
      item.manufacturer,
      item.color,
      item.wireRange,
      item.processSegment,
      item.status,
    ].some((value) => includes(value, q)));
  }

  getConnector(id: string) {
    const connector = this.connectors.find((item) => item.connectorId === id);
    if (!connector) throw new NotFoundException('连接器参数不存在。');
    return connector;
  }

  getFixtures(query?: FixtureQueryDto) {
    const q = query?.q?.trim().toLowerCase();
    if (!q) return this.fixtures;
    return this.fixtures.filter((item) => [
      item.fixtureCode,
      item.fixtureName,
      item.fixtureType,
      item.applicableProduct,
      item.station,
      item.processSegment,
      item.storageLocation,
      item.status,
    ].some((value) => includes(value, q)));
  }

  getFixture(id: string) {
    const fixture = this.fixtures.find((item) => item.fixtureId === id);
    if (!fixture) throw new NotFoundException('治具参数不存在。');
    return fixture;
  }

  search(query: HubSearchQueryDto) {
    const q = query.q?.trim().toLowerCase() ?? '';
    if (query.mode === 'connector') return { mode: query.mode, items: this.getConnectors({ q }) };
    if (query.mode === 'fixture') return { mode: query.mode, items: this.getFixtures({ q }) };
    const items = this.drawingDetails.flatMap((detail) => {
      const customer = detail.customer;
      const product = detail.product;
      const matched = !q || [
        customer?.customerName,
        customer?.customerShortName,
        product.productModel,
        product.productName,
        product.remark,
        ...detail.modules.flatMap((module) => [
          module.moduleName,
          module.remark,
          ...module.items.flatMap((item) => [item.title, item.fileName, item.remark, item.version]),
        ]),
      ].some((value) => includes(value, q));
      return matched ? [{ type: 'drawing-product', customer, product, modules: detail.modules }] : [];
    });
    return { mode: query.mode, items };
  }

  private resolveFileType(mimeType?: string): DrawingItem['fileType'] {
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType?.startsWith('image/')) return 'image';
    return 'card';
  }
}
