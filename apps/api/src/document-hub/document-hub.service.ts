import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { DocumentTypeV03, RequiredProcess } from '../common/enums/production.enum';
import type { ProductDocument } from '../common/types/production.types';
import { DocumentsService } from '../documents/documents.service';
import { LocalStorageService } from '../storage/local-storage.service';
import type { DeleteItemDto } from '../unified-documents/dto/delete-item.dto';
import { DeleteLockService } from '../unified-documents/helpers/delete-lock.service';
import { safeDeleteUploadedFile } from '../unified-documents/helpers/safe-delete';
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

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly localStorageService: LocalStorageService,
    private readonly deleteLockService: DeleteLockService,
  ) {}

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

  async getProduct(productId: string) {
    const detail = this.drawingDetails.find((item) => item.product.productId === productId);
    if (!detail) throw new NotFoundException('产品图纸资料不存在。');
    return this.withUploadedDocuments(detail);
  }

  async getProductByModel(productModel: string) {
    const product = hubProducts.find((item) => item.productModel === productModel);
    if (!product) return null;
    return this.getProduct(product.productId);
  }

  async getModule(productId: string, moduleKey: DrawingModuleKey) {
    const detail = await this.getProduct(productId);
    const module = detail.modules.find((item) => item.moduleKey === moduleKey);
    if (!module) throw new NotFoundException('图纸模块不存在。');
    return {
      product: detail.product,
      customer: detail.customer,
      module,
    };
  }

  async uploadDrawingItem(productId: string, moduleKey: DrawingModuleKey, dto: UploadDrawingItemDto, file?: Express.Multer.File) {
    const detail = await this.getProduct(productId);
    const module = detail.modules.find((item) => item.moduleKey === moduleKey);
    if (!module) throw new NotFoundException('图纸模块不存在。');

    const document = await this.documentsService.upload({
      productId,
      documentType: this.documentTypeForModule(moduleKey),
      title: dto.title,
      version: dto.version,
      status: 'effective',
      requiredForProcess: this.requiredProcessForModule(moduleKey),
      keywords: dto.keywords,
      remark: dto.remark || '主页面资料库上传到本地沙盒存储。',
    }, file);

    const nextItem = this.documentToDrawingItem(document);
    const mergedDetail = await this.getProduct(productId);
    const mergedModule = mergedDetail.modules.find((item) => item.moduleKey === moduleKey) ?? module;
    return {
      success: true,
      item: nextItem,
      module: mergedModule,
      product: mergedDetail.product,
      detail: mergedDetail,
    };
  }

  async deleteDrawingItem(productId: string, moduleKey: DrawingModuleKey, itemId: string, dto: DeleteItemDto) {
    this.deleteLockService.assertVerified(dto.password);
    const documents = this.localStorageService.readDocumentsSync() as ProductDocument[];
    const index = documents.findIndex((document) => {
      const id = document.documentId ?? document.id;
      return id === itemId && document.productId === productId && document.source === 'manual_upload';
    });
    if (index < 0) {
      throw new BadRequestException('当前资料不是本地上传资料，不能从主页面执行物理删除。');
    }

    const document = documents[index];
    if (this.moduleForDocumentType(document.documentType) !== moduleKey) {
      throw new BadRequestException('资料模块不匹配，已拒绝删除。');
    }

    documents.splice(index, 1);
    this.localStorageService.writeDocumentsSync(documents);
    const fileResult = safeDeleteUploadedFile(this.localStorageService.getUploadsDir(), document.storedFileName);
    const detail = await this.getProduct(productId);
    const module = detail.modules.find((item) => item.moduleKey === moduleKey);
    return {
      success: true,
      deletedItemId: itemId,
      fileResult,
      module,
      product: detail.product,
      detail,
      reason: dto.reason,
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

  async search(query: HubSearchQueryDto) {
    const q = query.q?.trim().toLowerCase() ?? '';
    if (query.mode === 'connector') return { mode: query.mode, items: this.getConnectors({ q }) };
    if (query.mode === 'fixture') return { mode: query.mode, items: this.getFixtures({ q }) };
    const details = await Promise.all(this.drawingDetails.map((detail) => this.withUploadedDocuments(detail)));
    const items = details.flatMap((detail) => {
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

  private async withUploadedDocuments(detail: ProductDrawingDetail): Promise<ProductDrawingDetail> {
    const next = clone(detail);
    const uploaded = await this.documentsService.findAll({ productId: next.product.productId }) as ProductDocument[];
    const uploadedItems = uploaded
      .filter((document) => document.source === 'manual_upload' && !document.archived)
      .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));

    for (const document of uploadedItems) {
      const moduleKey = this.moduleForDocumentType(document.documentType);
      const module = next.modules.find((item) => item.moduleKey === moduleKey);
      if (!module) continue;
      const item = this.documentToDrawingItem(document);
      if (!module.items.some((entry) => entry.itemId === item.itemId)) {
        module.items.unshift(item);
      }
      module.status = 'uploaded';
      module.updatedAt = document.updatedAt ?? module.updatedAt;
    }

    if (next.modules.some((module) => module.items.length)) {
      next.product.drawingStatus = next.modules.every((module) => module.items.length) ? 'available' : 'partial';
    } else {
      next.product.drawingStatus = 'no_drawing';
    }
    return next;
  }

  private documentToDrawingItem(document: ProductDocument): DrawingItem {
    return {
      itemId: document.documentId ?? document.id,
      title: document.title,
      fileType: document.previewType ?? this.resolveFileType(document.mimeType),
      previewUrl: document.previewUrl,
      fileName: document.originalFileName ?? document.title,
      version: document.version,
      remark: document.remark ?? document.description ?? document.mockPreviewText,
      uploadedAt: document.updatedAt ?? document.createdAt ?? new Date().toISOString(),
      source: 'manual_upload',
    };
  }

  private documentTypeForModule(moduleKey: DrawingModuleKey): DocumentTypeV03 {
    const map: Record<DrawingModuleKey, DocumentTypeV03> = {
      original_drawing: 'drawing_pdf',
      sop: 'sop_image',
      finished_images: 'finished_detail_image',
      accessory_specs: 'process_card',
      notes: 'process_card',
      tooling: 'process_card',
    };
    return map[moduleKey];
  }

  private moduleForDocumentType(documentType: DocumentTypeV03): DrawingModuleKey {
    const map: Record<DocumentTypeV03, DrawingModuleKey> = {
      drawing_pdf: 'original_drawing',
      sop_image: 'sop',
      connector_manual: 'sop',
      pinout_diagram: 'notes',
      finished_detail_image: 'finished_images',
      process_card: 'accessory_specs',
    };
    return map[documentType];
  }

  private requiredProcessForModule(moduleKey: DrawingModuleKey): RequiredProcess {
    if (moduleKey === 'sop' || moduleKey === 'finished_images') return 'back';
    return 'common';
  }
}
