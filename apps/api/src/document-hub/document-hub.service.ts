import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Workbook } from 'exceljs';
import type { DocumentTypeV03, RequiredProcess } from '../common/enums/production.enum';
import type { ProductDocument } from '../common/types/production.types';
import { DocumentsService } from '../documents/documents.service';
import { LocalStorageService } from '../storage/local-storage.service';
import { StorageService } from '../storage/storage.service';
import type { DeleteItemDto } from '../unified-documents/dto/delete-item.dto';
import { DeleteLockService } from '../unified-documents/helpers/delete-lock.service';
import { CreateConnectorParameterDto } from './dto/create-connector-parameter.dto';
import { CreateDrawingCustomerDto } from './dto/create-drawing-customer.dto';
import { CreateDrawingProductDto } from './dto/create-drawing-product.dto';
import { ConnectorQueryDto } from './dto/connector-query.dto';
import { DrawingQueryDto } from './dto/drawing-query.dto';
import { FixtureQueryDto } from './dto/fixture-query.dto';
import { HubSearchQueryDto } from './dto/search-query.dto';
import { UpdateConnectorParameterDto } from './dto/update-connector-parameter.dto';
import { UpdateDrawingCustomerDto } from './dto/update-drawing-customer.dto';
import { UpdateDrawingProductDto } from './dto/update-drawing-product.dto';
import { UploadDrawingItemDto } from './dto/upload-drawing-item.dto';
import { DrawingMetadataStore, createDefaultDrawingModules } from './drawing-metadata.store';
import { normalizeProductModel } from './helpers/pdf-name-parser';
import {
  ConnectorParameter,
  DrawingItem,
  DrawingModuleKey,
  FixtureParameter,
  HubCustomer,
  HubOrder,
  HubProductModel,
  ProductDrawingDetail,
  connectorParameters,
  fixtureParameters,
  hubOrders,
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

function normalizeDuplicateKey(value: string) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
}

function cleanText(value?: string) {
  return value?.normalize('NFKC').trim().replace(/\s+/g, ' ') ?? '';
}

function cleanOptionalText(value?: string) {
  const text = cleanText(value);
  return text || undefined;
}

function uniqueAliases(values: Array<string | undefined>) {
  return [...new Set(values.map(cleanText).filter(Boolean))];
}

function makeEntityId(prefix: string, value: string) {
  const slug = value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `${prefix}-${slug || 'item'}-${randomUUID().slice(0, 8)}`;
}

function cellText(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    const rich = value as { text?: string; result?: unknown; formula?: string; hyperlink?: string };
    if (rich.text) return rich.text;
    if (rich.result !== undefined) return cellText(rich.result);
    if (rich.hyperlink) return rich.hyperlink;
    if (rich.formula) return rich.formula;
  }
  return String(value).replace(/^\uFEFF/, '').trim();
}

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .replace(/^\uFEFF/, '')
    .replace(/\s+/g, '')
    .replace(/[()（）:：_\-]/g, '')
    .replace(/毫米/g, 'mm');
}

function connectorImportValue(row: Map<string, string>, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeader);
  for (const [key, value] of row.entries()) {
    if (normalizedAliases.includes(normalizeHeader(key))) return value;
  }
  return '';
}

type ConnectorImportStrategy = 'review' | 'skip' | 'overwrite';
type ConnectorImportAction = 'created' | 'updated' | 'skipped' | 'conflict' | 'error';

interface ConnectorImportIssue {
  field: string;
  message: string;
  resolution: string;
}

interface ParsedConnectorImportRow {
  rowNumber: number;
  connectorModel: string;
  specification: string;
  insertionLengthMm: number;
  outerStripLengthMm: number | null;
  innerStripLengthMm: number;
  status: string;
  remark: string;
}

interface ConnectorImportRowResult {
  rowNumber: number;
  connectorModel: string;
  specification?: string;
  action: ConnectorImportAction;
  valid: boolean;
  message: string;
  resolution?: string;
  issues?: ConnectorImportIssue[];
}

const connectorImportAliases = {
  connectorModel: ['连接器型号', '型号', '产品型号', '规格型号', 'connectorModel', 'connector_model', 'model'],
  specification: ['规格', '规格描述', '规格参数', 'specification', 'spec'],
  insertionLengthMm: ['入长', '入长mm', '入长(mm)', '入长毫米', '入线长度', 'insertionLengthMm', 'insertion_length_mm'],
  outerStripLengthMm: ['外剥长度', '外剥长度mm', '外剥长度(mm)', '外剥皮', '外剥皮mm', '外剥皮(mm)', '外剥', 'outerStripLengthMm', 'outer_strip_length_mm'],
  innerStripLengthMm: ['内剥长度', '内剥长度mm', '内剥长度(mm)', '内剥皮', '内剥皮mm', '内剥皮(mm)', '内剥', 'innerStripLengthMm', 'inner_strip_length_mm'],
  status: ['状态', 'status'],
  remark: ['备注', '注意事项', '备注注意事项', 'remark', 'note'],
};

function parseLengthCell(
  value: unknown,
  field: string,
  options: { allowBlank?: boolean } = {},
): { value?: number | null; issue?: ConnectorImportIssue } {
  const raw = cellText(value);
  const text = raw
    .replace(/[，,]/g, '.')
    .replace(/\s+/g, '')
    .replace(/毫米|mm/gi, '')
    .trim();

  if (!text) {
    if (options.allowBlank) return { value: null };
    return {
      issue: {
        field,
        message: `${field}为空`,
        resolution: `请填写 ${field} 数字，例如 26.5。`,
      },
    };
  }

  if (!/^\d+(\.\d+)?$/.test(text)) {
    return {
      issue: {
        field,
        message: `${field}格式不是数字`,
        resolution: `请改成纯数字或小数，例如 26.5，不要填写文字或多个数值。`,
      },
    };
  }

  const numberValue = Number(text);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return {
      issue: {
        field,
        message: `${field}不是有效数值`,
        resolution: '请填写大于等于 0 的数字。',
      },
    };
  }

  return { value: numberValue };
}

function connectorsOverlap(leftModel: string, rightModel: string) {
  return leftModel.trim().toLowerCase() === rightModel.trim().toLowerCase();
}

const connectorStatusRank: Record<string, number> = {
  '\u542f\u7528': 0,
  '\u590d\u6838\u4e2d': 1,
  '\u505c\u7528': 2,
};

function compareConnectors(left: ConnectorParameter, right: ConnectorParameter) {
  const statusDiff = (connectorStatusRank[left.status ?? ''] ?? 9) - (connectorStatusRank[right.status ?? ''] ?? 9);
  if (statusDiff) return statusDiff;
  return left.connectorModel.localeCompare(right.connectorModel, 'zh-Hans-CN', { numeric: true });
}

function connectorFieldSearch(item: ConnectorParameter, normalizedKeyword: string) {
  const fieldSearches = [
    { aliases: ['\u5165\u957f', '\u5165\u957fmm', '\u5165\u957f\u6beb\u7c73'], value: item.insertionLengthMm },
    { aliases: ['\u5916\u5265', '\u5916\u5265\u76ae', '\u5916\u5265\u957f\u5ea6', '\u5916\u5265mm', '\u5916\u5265\u76aemm'], value: item.outerStripLengthMm },
    { aliases: ['\u5185\u5265', '\u5185\u5265\u76ae', '\u5185\u5265\u957f\u5ea6', '\u5185\u5265mm', '\u5185\u5265\u76aemm'], value: item.innerStripLengthMm },
  ];
  return fieldSearches.some(({ aliases, value }) => aliases.some((alias) => {
    if (!normalizedKeyword.startsWith(alias)) return false;
    const numericText = normalizedKeyword
      .replace(alias, '')
      .replace(/mm|\u6beb\u7c73/g, '')
      .trim();
    return numericText ? String(value ?? '').includes(numericText) : value !== null && value !== undefined;
  }));
}

function connectorMatchesKeyword(item: ConnectorParameter, q: string) {
  if (!q) return true;
  const normalizedKeyword = q.replace(/\s+/g, '').toLowerCase();
  const outerBlankWords = ['\u5916\u5265\u7a7a', '\u5916\u5265\u4e3a\u7a7a', '\u672a\u586b\u5916\u5265', '\u65e0\u5916\u5265', '\u7a7a\u5916\u5265', '\u5916\u5265\u7559\u7a7a'];
  if (outerBlankWords.some((word) => normalizedKeyword.includes(word))) {
    return item.outerStripLengthMm === null || item.outerStripLengthMm === undefined;
  }
  if (connectorFieldSearch(item, normalizedKeyword)) return true;
  return [
    item.connectorModel,
    item.insertionLengthMm,
    item.outerStripLengthMm,
    item.innerStripLengthMm,
    item.remark,
    item.status,
  ].some((value) => includes(value, q));
}

function makeImportRowResult(
  row: Pick<ParsedConnectorImportRow, 'rowNumber' | 'connectorModel' | 'specification'>,
  action: ConnectorImportAction,
  valid: boolean,
  message: string,
  resolution?: string,
  issues?: ConnectorImportIssue[],
): ConnectorImportRowResult {
  return {
    rowNumber: row.rowNumber,
    connectorModel: row.connectorModel || '-',
    specification: row.specification,
    action,
    valid,
    message,
    resolution,
    issues,
  };
}

function hasConnectorImportHeader(headers: string[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeader);
  return headers.some((header) => normalizedAliases.includes(normalizeHeader(header)));
}

const drawingMetadataFiles = [
  'drawing-customers.json',
  'drawing-products.json',
  'drawing-module-settings.json',
  'drawing-import-records.json',
];

@Injectable()
export class DocumentHubService implements OnModuleInit {
  private readonly logger = new Logger(DocumentHubService.name);
  private readonly orders: HubOrder[] = clone(hubOrders);
  private readonly connectors: ConnectorParameter[] = clone(connectorParameters);
  private readonly fixtures: FixtureParameter[] = clone(fixtureParameters);

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly localStorageService: LocalStorageService,
    private readonly storageService: StorageService,
    private readonly deleteLockService: DeleteLockService,
    private readonly drawingMetadataStore: DrawingMetadataStore,
  ) {}

  onModuleInit() {
    this.assertDrawingMetadataReadable();
    this.initializeDrawingMetadataStore();
  }

  private initializeDrawingMetadataStore() {
    const mode = process.env.DEMO_DATA_MODE === 'empty' ? 'empty' : 'demo';
    const store = this.drawingMetadataStore as DrawingMetadataStore & {
      initializeFromSeedIfEmpty?: () => unknown;
    };

    if (mode === 'demo' && typeof store.initializeFromSeedIfEmpty === 'function') {
      store.initializeFromSeedIfEmpty();
      return;
    }

    this.drawingMetadataStore.ensureInitialized();
  }

  private assertDrawingMetadataReadable() {
    const metadataDir = this.localStorageService.getMetadataDir();
    for (const fileName of drawingMetadataFiles) {
      const file = join(metadataDir, fileName);
      if (!existsSync(file)) continue;

      try {
        JSON.parse(readFileSync(file, 'utf8'));
      } catch (error) {
        const message = `Drawing metadata file is not valid JSON: ${fileName}. Fix or move the damaged file before starting DocumentHubService.`;
        this.logger.error(message, error instanceof Error ? error.stack : undefined);
        throw new Error(message);
      }
    }
  }

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
    const customers = this.drawingMetadataStore.readCustomers();
    if (!q) return customers;
    return customers.filter((customer) => [
      customer.customerName,
      customer.customerShortName,
      customer.customerCode,
      ...(customer.aliases ?? []),
    ].some((value) => includes(value, q)));
  }

  getProducts(customerId: string, query?: DrawingQueryDto) {
    const q = query?.q?.trim().toLowerCase();
    return this.drawingMetadataStore.readProducts().filter((product) => {
      const customerMatched = product.customerId === customerId;
      const queryMatched = !q || [
        product.productModel,
        product.normalizedProductModel,
        product.productName,
        product.remark,
        ...(product.searchKeywords ?? []),
      ].some((value) => includes(value, q));
      return customerMatched && queryMatched;
    });
  }

  createDrawingCustomer(dto: CreateDrawingCustomerDto) {
    const customerName = normalizeDuplicateKey(dto.customerName ?? '');
    if (!customerName) throw new BadRequestException('客户名称不能为空。');

    const customers = this.drawingMetadataStore.readCustomers();
    this.assertUniqueCustomerName(customers, customerName);

    const timestamp = new Date().toISOString();
    const customer: HubCustomer = {
      customerId: makeEntityId('cust', customerName),
      customerName,
      customerShortName: cleanText(dto.customerShortName) || customerName,
      customerCode: cleanOptionalText(dto.customerCode),
      aliases: uniqueAliases([...(dto.aliases ?? []), customerName, dto.customerShortName]),
      status: dto.status ?? 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.drawingMetadataStore.writeCustomers([...customers, customer]);
    return this.drawingMetadataStore.readCustomers().find((item) => item.customerId === customer.customerId) ?? customer;
  }

  updateDrawingCustomer(customerId: string, dto: UpdateDrawingCustomerDto) {
    const customers = this.drawingMetadataStore.readCustomers();
    const current = customers.find((customer) => customer.customerId === customerId);
    if (!current) throw new NotFoundException('客户不存在。');

    const nextName = dto.customerName !== undefined ? normalizeDuplicateKey(dto.customerName) : current.customerName;
    if (!nextName) throw new BadRequestException('客户名称不能为空。');
    this.assertUniqueCustomerName(customers, nextName, customerId);

    const nextCustomer: HubCustomer = {
      ...current,
      customerName: nextName,
      customerShortName: dto.customerShortName !== undefined
        ? (cleanText(dto.customerShortName) || nextName)
        : current.customerShortName,
      customerCode: dto.customerCode !== undefined ? cleanOptionalText(dto.customerCode) : current.customerCode,
      aliases: dto.aliases !== undefined
        ? uniqueAliases([...dto.aliases, nextName, dto.customerShortName ?? current.customerShortName])
        : uniqueAliases([...(current.aliases ?? []), nextName, current.customerShortName]),
      status: dto.status ?? current.status ?? 'active',
      updatedAt: new Date().toISOString(),
    };

    this.drawingMetadataStore.writeCustomers(customers.map((customer) => (
      customer.customerId === customerId ? nextCustomer : customer
    )));
    this.syncCustomerIntoDetails(nextCustomer);

    return this.drawingMetadataStore.readCustomers().find((customer) => customer.customerId === customerId) ?? nextCustomer;
  }

  createDrawingProduct(dto: CreateDrawingProductDto) {
    const customerId = cleanText(dto.customerId);
    const customer = this.drawingMetadataStore.readCustomers().find((item) => item.customerId === customerId);
    if (!customer) throw new NotFoundException('客户不存在。');

    const productModel = cleanText(dto.productModel);
    const normalizedProductModel = normalizeProductModel(productModel);
    if (!productModel || !normalizedProductModel) throw new BadRequestException('产品型号不能为空。');

    const products = this.drawingMetadataStore.readProducts();
    this.assertUniqueProductModel(products, customerId, normalizedProductModel);

    const timestamp = new Date().toISOString();
    const product: HubProductModel = {
      productId: this.drawingMetadataStore.makeProductId(customerId, normalizedProductModel),
      customerId,
      productModel,
      normalizedProductModel,
      productName: cleanText(dto.productName) || productModel,
      drawingStatus: 'no_drawing',
      source: 'manual_create',
      remark: cleanOptionalText(dto.remark),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.drawingMetadataStore.writeProducts([...products, product]);
    const savedProduct = this.drawingMetadataStore.readProducts().find((item) => item.productId === product.productId) ?? product;
    this.drawingMetadataStore.upsertDetail(this.drawingMetadataStore.makeProductDetail(customer, savedProduct));
    return savedProduct;
  }

  updateDrawingProduct(productId: string, dto: UpdateDrawingProductDto) {
    const products = this.drawingMetadataStore.readProducts();
    const current = products.find((product) => product.productId === productId);
    if (!current) throw new NotFoundException('产品不存在。');

    const productModel = dto.productModel !== undefined ? cleanText(dto.productModel) : current.productModel;
    const normalizedProductModel = normalizeProductModel(productModel);
    if (!productModel || !normalizedProductModel) throw new BadRequestException('产品型号不能为空。');

    this.assertUniqueProductModel(products, current.customerId, normalizedProductModel, productId);

    const nextProduct: HubProductModel = {
      ...current,
      productModel,
      normalizedProductModel,
      productName: dto.productName !== undefined ? (cleanText(dto.productName) || productModel) : current.productName,
      remark: dto.remark !== undefined ? cleanOptionalText(dto.remark) : current.remark,
      updatedAt: new Date().toISOString(),
    };

    this.drawingMetadataStore.writeProducts(products.map((product) => (
      product.productId === productId ? nextProduct : product
    )));

    const savedProduct = this.drawingMetadataStore.readProducts().find((product) => product.productId === productId) ?? nextProduct;
    this.syncProductIntoDetail(savedProduct);
    return savedProduct;
  }

  async getProduct(productId: string) {
    const detail = this.findDrawingDetail(productId);
    if (!detail) throw new NotFoundException('产品图纸资料不存在。');
    return this.withUploadedDocuments(detail);
  }

  async getProductByModel(productModel: string) {
    const normalizedProductModel = normalizeProductModel(productModel);
    const product = this.drawingMetadataStore.readProducts().find((item) => (
      item.productModel === productModel ||
      item.normalizedProductModel === normalizedProductModel ||
      normalizeProductModel(item.productModel) === normalizedProductModel
    ));
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
    const fileResult = await this.storageService.deleteDocumentObject(document);
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
    return this.connectors
      .filter((item) => connectorMatchesKeyword(item, q ?? ''))
      .sort(compareConnectors);
  }

  getConnector(id: string) {
    const connector = this.connectors.find((item) => item.connectorId === id);
    if (!connector) throw new NotFoundException('Connector parameter not found.');
    return connector;
  }

  createConnector(dto: CreateConnectorParameterDto) {
    const connectorModel = dto.connectorModel.trim();
    if (!connectorModel) throw new BadRequestException('Connector model is required.');
    const specification = '';
    if (this.connectors.some((item) => connectorsOverlap(item.connectorModel, connectorModel))) {
      throw new BadRequestException('Connector model already exists.');
    }
    const connector: ConnectorParameter = {
      connectorId: `conn-${randomUUID().slice(0, 8)}`,
      connectorModel,
      specification,
      insertionLengthMm: dto.insertionLengthMm,
      outerStripLengthMm: dto.outerStripLengthMm ?? null,
      innerStripLengthMm: dto.innerStripLengthMm,
      status: dto.status?.trim() || '\u542f\u7528',
      remark: dto.remark?.trim() ?? '',
    };
    this.connectors.unshift(connector);
    this.connectors.sort(compareConnectors);
    return connector;
  }

  updateConnector(id: string, dto: UpdateConnectorParameterDto) {
    const connector = this.connectors.find((item) => item.connectorId === id);
    if (!connector) throw new NotFoundException('Connector parameter not found.');
    if (dto.connectorModel !== undefined || dto.specification !== undefined) {
      const connectorModel = dto.connectorModel?.trim() ?? connector.connectorModel;
      const specification = '';
      if (!connectorModel) throw new BadRequestException('Connector model is required.');
      const duplicate = this.connectors.find((item) => item.connectorId !== id && connectorsOverlap(item.connectorModel, connectorModel));
      if (duplicate) throw new BadRequestException('Connector model already exists.');
      connector.connectorModel = connectorModel;
      connector.specification = specification;
    }
    if (dto.insertionLengthMm !== undefined) connector.insertionLengthMm = dto.insertionLengthMm;
    if (dto.outerStripLengthMm !== undefined) connector.outerStripLengthMm = dto.outerStripLengthMm;
    if (dto.innerStripLengthMm !== undefined) connector.innerStripLengthMm = dto.innerStripLengthMm;
    if (dto.remark !== undefined) connector.remark = dto.remark.trim();
    if (dto.status !== undefined) connector.status = dto.status.trim() || '\u542f\u7528';
    this.connectors.sort(compareConnectors);
    return connector;
  }

  deleteConnector(id: string) {
    const index = this.connectors.findIndex((item) => item.connectorId === id);
    if (index < 0) throw new NotFoundException('Connector parameter not found.');
    const [deleted] = this.connectors.splice(index, 1);
    return { success: true, deletedId: id, connector: deleted };
  }

  async importConnectors(file?: Express.Multer.File, duplicateStrategy: ConnectorImportStrategy = 'review') {
    if (!file) throw new BadRequestException('Excel file is required.');
    const workbook = new Workbook();
    await workbook.xlsx.load(file.buffer as unknown as ArrayBuffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('No readable worksheet found.');

    const headers: string[] = [];
    sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
      headers[colNumber - 1] = cellText(cell.value);
    });

    const requiredHeaders = [
      { label: '型号', aliases: connectorImportAliases.connectorModel },
      { label: '入长mm', aliases: connectorImportAliases.insertionLengthMm },
      { label: '内剥皮mm', aliases: connectorImportAliases.innerStripLengthMm },
    ];
    const missingHeaders = requiredHeaders.filter((item) => !hasConnectorImportHeader(headers, item.aliases));
    if (missingHeaders.length) {
      throw new BadRequestException(`Excel 表头缺少：${missingHeaders.map((item) => item.label).join('、')}。必填表头：型号、入长mm、内剥皮mm；可选表头：外剥皮mm、备注。`);
    }

    const parsedRows: ParsedConnectorImportRow[] = [];
    const rows: ConnectorImportRowResult[] = [];

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const excelRow = sheet.getRow(rowNumber);
      const data = new Map<string, string>();
      headers.forEach((header, index) => {
        if (header) data.set(header, cellText(excelRow.getCell(index + 1).value));
      });
      if (![...data.values()].some((value) => value.trim())) continue;

      const connectorModel = connectorImportValue(data, connectorImportAliases.connectorModel).trim();
      const specification = '';
      const insertionLength = parseLengthCell(connectorImportValue(data, connectorImportAliases.insertionLengthMm), '入长');
      const outerStripLength = parseLengthCell(connectorImportValue(data, connectorImportAliases.outerStripLengthMm), '外剥皮', { allowBlank: true });
      const innerStripLength = parseLengthCell(connectorImportValue(data, connectorImportAliases.innerStripLengthMm), '内剥皮');
      const status = connectorImportValue(data, connectorImportAliases.status).trim() || '启用';
      const remark = connectorImportValue(data, connectorImportAliases.remark).trim();
      const issues: ConnectorImportIssue[] = [];

      if (!connectorModel) {
        issues.push({
          field: '型号',
          message: '型号为空',
          resolution: '请在型号列填写连接器型号，例如 PL182X-301-50。',
        });
      }
      if (insertionLength.issue) issues.push(insertionLength.issue);
      if (outerStripLength.issue) issues.push(outerStripLength.issue);
      if (innerStripLength.issue) issues.push(innerStripLength.issue);

      if (issues.length) {
        rows.push(makeImportRowResult(
          { rowNumber, connectorModel: connectorModel || '-', specification },
          'error',
          false,
          issues.map((issue) => issue.message).join('；'),
          issues.map((issue) => issue.resolution).join(' '),
          issues,
        ));
        continue;
      }

      parsedRows.push({
        rowNumber,
        connectorModel,
        specification,
        insertionLengthMm: insertionLength.value ?? 0,
        outerStripLengthMm: outerStripLength.value ?? null,
        innerStripLengthMm: innerStripLength.value ?? 0,
        status,
        remark,
      });
    }

    const previousRows: ParsedConnectorImportRow[] = [];
    const duplicateRows: ConnectorImportRowResult[] = [];

    for (const row of parsedRows) {
      const previous = previousRows.find((item) => connectorsOverlap(item.connectorModel, row.connectorModel));
      const existing = this.connectors.find((item) => connectorsOverlap(item.connectorModel, row.connectorModel));
      if (previous || existing) {
        duplicateRows.push(makeImportRowResult(
          row,
          'conflict',
          false,
          previous ? `Excel 内第 ${previous.rowNumber} 行已有相同型号。` : '参数库中已存在相同型号。',
          duplicateStrategy === 'review'
            ? '请选择“跳过重复并导入”或“覆盖重复并导入”。'
            : '已按当前导入策略处理。',
        ));
      }
      previousRows.push(row);
    }

    if (duplicateRows.length && duplicateStrategy === 'review') {
      return {
        requiresDecision: true,
        requiresOverwrite: true,
        duplicateStrategy,
        totalRows: rows.length + parsedRows.length,
        validRows: parsedRows.length,
        importedRows: 0,
        createdRows: 0,
        updatedRows: 0,
        skippedRows: rows.length,
        errorRows: rows.length,
        duplicateRows,
        rows: [...rows, ...duplicateRows],
        connectors: this.connectors,
      };
    }

    let createdRows = 0;
    let updatedRows = 0;
    let skippedDuplicateRows = 0;

    for (const row of parsedRows) {
      const duplicate = duplicateRows.find((item) => item.rowNumber === row.rowNumber);
      const existing = this.connectors.find((item) => connectorsOverlap(item.connectorModel, row.connectorModel));

      if (duplicate && duplicateStrategy === 'skip') {
        skippedDuplicateRows += 1;
        rows.push(makeImportRowResult(
          row,
          'skipped',
          false,
          '重复型号已跳过。',
          '如需更新已有参数，请重新导入并选择覆盖重复。',
        ));
        continue;
      }

      if (existing) {
        Object.assign(existing, {
          specification: row.specification,
          insertionLengthMm: row.insertionLengthMm,
          outerStripLengthMm: row.outerStripLengthMm,
          innerStripLengthMm: row.innerStripLengthMm,
          status: row.status,
          remark: row.remark,
        });
        updatedRows += 1;
        rows.push(makeImportRowResult(row, 'updated', true, '已更新已有连接器参数。'));
      } else {
        this.connectors.unshift({
          connectorId: `conn-${randomUUID().slice(0, 8)}`,
          connectorModel: row.connectorModel,
          specification: row.specification,
          insertionLengthMm: row.insertionLengthMm,
          outerStripLengthMm: row.outerStripLengthMm,
          innerStripLengthMm: row.innerStripLengthMm,
          status: row.status,
          remark: row.remark,
        });
        createdRows += 1;
        rows.push(makeImportRowResult(row, 'created', true, '已新增连接器参数。'));
      }
    }

    this.connectors.sort(compareConnectors);

    const errorRows = rows.filter((row) => row.action === 'error').length;
    return {
      requiresDecision: false,
      requiresOverwrite: false,
      duplicateStrategy,
      totalRows: rows.length,
      validRows: parsedRows.length,
      importedRows: createdRows + updatedRows,
      createdRows,
      updatedRows,
      skippedRows: errorRows + skippedDuplicateRows,
      errorRows,
      duplicateRows,
      rows,
      connectors: this.connectors,
    };
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
    const details = await Promise.all(
      this.drawingMetadataStore.readDetails().map((detail) => this.withUploadedDocuments(this.withCurrentDrawingMetadata(detail))),
    );
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

  private assertUniqueCustomerName(customers: HubCustomer[], customerName: string, currentCustomerId?: string) {
    const duplicateKey = normalizeDuplicateKey(customerName);
    const duplicate = customers.find((customer) => (
      customer.customerId !== currentCustomerId &&
      normalizeDuplicateKey(customer.customerName) === duplicateKey
    ));
    if (duplicate) throw new ConflictException('同名客户已存在。');
  }

  private assertUniqueProductModel(
    products: HubProductModel[],
    customerId: string,
    normalizedProductModel: string,
    currentProductId?: string,
  ) {
    const duplicate = products.find((product) => (
      product.productId !== currentProductId &&
      product.customerId === customerId &&
      (product.normalizedProductModel ?? normalizeProductModel(product.productModel)) === normalizedProductModel
    ));
    if (duplicate) throw new ConflictException('同客户下产品型号已存在。');
  }

  private syncCustomerIntoDetails(customer: HubCustomer) {
    const details = this.drawingMetadataStore.readDetails();
    let changed = false;
    const nextDetails = details.map((detail) => {
      if (detail.product.customerId !== customer.customerId && detail.customer?.customerId !== customer.customerId) {
        return detail;
      }
      changed = true;
      return {
        ...detail,
        customer,
      };
    });
    if (changed) this.drawingMetadataStore.writeDetails(nextDetails);
  }

  private syncProductIntoDetail(product: HubProductModel) {
    const customer = this.drawingMetadataStore.readCustomers().find((item) => item.customerId === product.customerId);
    const details = this.drawingMetadataStore.readDetails();
    const detail = details.find((item) => item.product.productId === product.productId);

    if (detail) {
      this.drawingMetadataStore.upsertDetail({
        ...detail,
        product,
        customer: customer ?? detail.customer,
      });
      return;
    }

    if (customer) {
      this.drawingMetadataStore.upsertDetail(this.drawingMetadataStore.makeProductDetail(customer, product));
    }
  }

  private findDrawingDetail(productId: string): ProductDrawingDetail | undefined {
    const detail = this.drawingMetadataStore.readDetails().find((item) => item.product.productId === productId);
    if (detail) return this.withCurrentDrawingMetadata(detail);

    const product = this.drawingMetadataStore.readProducts().find((item) => item.productId === productId);
    if (!product) return undefined;

    const customer = this.drawingMetadataStore.readCustomers().find((item) => item.customerId === product.customerId);
    return {
      product: clone(product),
      customer: customer ? clone(customer) : undefined,
      modules: createDefaultDrawingModules(),
    };
  }

  private withCurrentDrawingMetadata(detail: ProductDrawingDetail): ProductDrawingDetail {
    const product = this.drawingMetadataStore
      .readProducts()
      .find((item) => item.productId === detail.product.productId) ?? detail.product;
    const customer = this.drawingMetadataStore
      .readCustomers()
      .find((item) => item.customerId === product.customerId) ?? detail.customer;

    return {
      ...clone(detail),
      product: clone(product),
      customer: customer ? clone(customer) : undefined,
    };
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
      storageProvider: document.storageProvider,
      storageKey: document.storageKey,
      checksumSha256: document.checksumSha256,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
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
