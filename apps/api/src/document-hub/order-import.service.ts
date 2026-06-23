import {
  BadRequestException,
  ConflictException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { DRAWING_REPOSITORY, ORDER_REPOSITORY } from '../persistence/persistence.tokens';
import type { DrawingRepository, OrderRepository } from '../persistence/persistence.types';
import { OrderImportApplyDto, OrderImportPreviewFormDto } from './dto/order-import.dto';
import { parseOrderExcel } from './helpers/order-excel-parser';
import type { HubCustomer, HubProductModel } from './mock/document-hub.seed';
import {
  normalizeOrderProductModel,
  OrderImportAction,
  OrderImportApplyItemRecord,
  OrderImportBatchRecord,
  OrderImportPreviewItemRecord,
  OrderProductionStatus,
  ProductResolutionStatus,
} from './order-metadata.store';
import { OrderStatusSyncService } from './order-status-sync.service';

const applyingLocks = new Set<string>();
const previewTtlMs = 24 * 60 * 60 * 1000;

function cleanText(value?: string | null) {
  return value?.normalize('NFKC').trim().replace(/\s+/g, ' ') ?? '';
}

function operator(dto?: { operatorId?: string; operatorName?: string }) {
  return {
    operatorId: cleanText(dto?.operatorId) || 'local-user',
    operatorName: cleanText(dto?.operatorName) || '本地操作员',
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

interface ProductResolution {
  status: ProductResolutionStatus;
  product?: HubProductModel;
  customer?: HubCustomer;
  products?: HubProductModel[];
}

@Injectable()
export class OrderImportService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepository: OrderRepository,
    @Inject(DRAWING_REPOSITORY) private readonly drawingRepository: DrawingRepository,
    private readonly orderStatusSyncService: OrderStatusSyncService,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  async preview(dto: OrderImportPreviewFormDto, file?: Express.Multer.File) {
    const scope = dto.scope;
    if (scope !== 'today' && scope !== 'week') {
      throw new BadRequestException('订单范围必须是 today 或 week。');
    }

    let parsedRows;
    try {
      parsedRows = await parseOrderExcel(file as Express.Multer.File);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : '订单 Excel 解析失败。');
    }

    const importBatchId = `ORDIMP-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const seen = new Set<string>();
    const items: OrderImportPreviewItemRecord[] = [];

    for (const parsed of parsedRows) {
      const importItemId = `ORDITEM-${parsed.rowNumber}-${randomUUID().slice(0, 8)}`;
      if (parsed.errorMessage) {
        items.push(this.makePreviewItem({
          importItemId,
          rowNumber: parsed.rowNumber,
          rawProductModel: parsed.rawProductModel,
          productModel: parsed.productModel,
          normalizedProductModel: parsed.normalizedProductModel,
          action: 'error',
          resolutionStatus: 'unknown',
          productionStatus: 'no_drawing',
          errorMessage: parsed.errorMessage,
        }));
        continue;
      }

      if (seen.has(parsed.normalizedProductModel)) {
        items.push(this.makePreviewItem({
          importItemId,
          rowNumber: parsed.rowNumber,
          rawProductModel: parsed.rawProductModel,
          productModel: parsed.productModel,
          normalizedProductModel: parsed.normalizedProductModel,
          action: 'duplicate_in_file',
          resolutionStatus: 'unknown',
          productionStatus: 'no_drawing',
          message: '文件内已有相同产品型号，本行默认跳过。',
        }));
        continue;
      }
      seen.add(parsed.normalizedProductModel);

      if (await this.hasActiveOrder(scope, parsed.normalizedProductModel)) {
        items.push(this.makePreviewItem({
          importItemId,
          rowNumber: parsed.rowNumber,
          rawProductModel: parsed.rawProductModel,
          productModel: parsed.productModel,
          normalizedProductModel: parsed.normalizedProductModel,
          action: 'already_active',
          resolutionStatus: 'unknown',
          productionStatus: 'no_drawing',
          message: '同范围内已有进行中的相同产品型号订单。',
        }));
        continue;
      }

      const resolution = this.resolveProduct(parsed.normalizedProductModel);
      const productionStatus = resolution.product
        ? await this.orderStatusSyncService.deriveProductionStatus({ linkedProductId: resolution.product.productId })
        : 'no_drawing';
      const action = this.actionForResolution(resolution.status);
      items.push(this.makePreviewItem({
        importItemId,
        rowNumber: parsed.rowNumber,
        rawProductModel: parsed.rawProductModel,
        productModel: parsed.productModel,
        normalizedProductModel: parsed.normalizedProductModel,
        action,
        resolutionStatus: resolution.status,
        productionStatus,
        product: resolution.product,
        customer: resolution.customer,
        message: this.messageForAction(action),
      }));
    }

    const createdAt = new Date().toISOString();
    const batch = await this.orderRepository.saveImportBatch({
      importBatchId,
      scope,
      fileName: file?.originalname,
      status: 'previewed',
      totalRows: items.length,
      createOrderCount: 0,
      alreadyActiveCount: 0,
      duplicateInFileCount: 0,
      needsConfirmationCount: 0,
      productNotFoundCount: 0,
      errorCount: 0,
      expiresAt: new Date(Date.now() + previewTtlMs).toISOString(),
      createdAt,
      updatedAt: createdAt,
      items,
    });

    await this.writeBatchAudit('order_import_previewed', batch, operator());
    return this.toSafePreviewResponse(batch);
  }

  async apply(dto: OrderImportApplyDto) {
    const importBatchId = cleanText(dto.importBatchId);
    if (!importBatchId) throw new BadRequestException('订单导入批次不能为空。');
    const batch = await this.orderRepository.getImportBatch(importBatchId);
    if (!batch) throw new NotFoundException('订单导入预览记录不存在。');
    if (batch.status === 'applying' || applyingLocks.has(importBatchId)) {
      throw new ConflictException('该订单导入批次正在处理，请稍后再试。');
    }
    if (this.isExpired(batch)) {
      await this.orderRepository.updateImportBatch(importBatchId, { status: 'expired' });
      throw new GoneException('订单导入预览已过期，请重新上传 XLSX。');
    }
    if (this.isCompleted(batch)) return this.toSafeApplyResponse(batch);

    const requestItems = dto.items ?? [];
    if (!requestItems.length) throw new BadRequestException('请至少提交一个订单导入项。');
    this.assertRequestItemsBelongToBatch(batch, requestItems);
    const seenRequestIds = new Set<string>();
    for (const item of requestItems) {
      if (seenRequestIds.has(item.importItemId)) throw new BadRequestException('订单导入项重复提交。');
      seenRequestIds.add(item.importItemId);
    }

    const op = operator(dto);
    applyingLocks.add(importBatchId);
    try {
      await this.orderRepository.updateImportBatch(importBatchId, {
        status: 'applying',
        operatorId: op.operatorId,
        operatorName: op.operatorName,
      });

      const latest = await this.orderRepository.getImportBatch(importBatchId) ?? batch;
      const previousApplyItems = new Map((latest.applyItems ?? []).map((item) => [item.importItemId, item]));
      const requestById = new Map(requestItems.map((item) => [item.importItemId, item]));

      for (const previewItem of latest.items) {
        const request = requestById.get(previewItem.importItemId);
        if (!request) continue;
        const previous = previousApplyItems.get(previewItem.importItemId);
        if (previous && previous.result === 'created') continue;
        const result = await this.applyOneItem(latest, previewItem, request, op);
        previousApplyItems.set(previewItem.importItemId, result);
      }

      const applyItems = latest.items
        .map((item) => previousApplyItems.get(item.importItemId))
        .filter(Boolean) as OrderImportApplyItemRecord[];
      const status = this.deriveBatchStatus(applyItems);
      const appliedAt = new Date().toISOString();
      const saved = await this.orderRepository.updateImportBatch(importBatchId, {
        status,
        appliedAt,
        applyItems,
        operatorId: op.operatorId,
        operatorName: op.operatorName,
        createdCount: applyItems.filter((item) => item.result === 'created').length,
        skippedCount: applyItems.filter((item) => item.result !== 'created').length,
      }) ?? latest;
      await this.writeBatchAudit('order_import_applied', saved, op);
      return this.toSafeApplyResponse(saved);
    } finally {
      applyingLocks.delete(importBatchId);
    }
  }

  private async applyOneItem(
    batch: OrderImportBatchRecord,
    item: OrderImportPreviewItemRecord,
    request: {
      selected?: boolean;
      confirmedCustomerId?: string;
      confirmedProductId?: string;
      remark?: string;
    },
    op: { operatorId: string; operatorName: string },
  ): Promise<OrderImportApplyItemRecord> {
    const appliedAt = new Date().toISOString();
    const base = { importItemId: item.importItemId, appliedAt };

    if (request.selected === false) {
      return { ...base, result: 'skipped_by_user', message: '用户已跳过该订单。' };
    }
    if (item.action === 'error') {
      return { ...base, result: 'error', message: item.errorMessage ?? '该行无法导入。', errorMessage: item.errorMessage };
    }
    if (item.action === 'duplicate_in_file') {
      return { ...base, result: 'skipped_duplicate', message: '文件内重复型号已跳过。' };
    }
    if (item.action === 'already_active' || await this.hasActiveOrder(batch.scope, item.normalizedProductModel)) {
      return { ...base, result: 'already_active', message: '同范围内已有进行中的相同产品型号订单。' };
    }

    const link = this.resolveApplyLink(item, request);
    if (link.result) return { ...base, ...link.result };

    const productionStatus = await this.orderStatusSyncService.deriveProductionStatus({
      linkedProductId: link.product?.productId ?? null,
    });
    const created = await this.orderRepository.createOrder({
      scope: batch.scope,
      productModel: item.productModel,
      normalizedProductModel: item.normalizedProductModel,
      customerId: link.customer?.customerId ?? null,
      customerName: link.customer?.customerName ?? null,
      linkedProductId: link.product?.productId ?? null,
      productResolutionStatus: link.product ? 'found' : 'product_not_found',
      quantity: null,
      quantityProvided: false,
      productionStatus,
      completionStatus: 'pending',
      source: 'excel_import',
      importBatchId: batch.importBatchId,
      importItemId: item.importItemId,
      remark: cleanText(request.remark) || null,
    });
    await this.orderStatusSyncService.writeAudit('order_created', created, {
      importBatchId: batch.importBatchId,
      operatorId: op.operatorId,
      operatorName: op.operatorName,
    });
    return {
      ...base,
      orderId: created.orderId,
      result: 'created',
      message: link.product ? '订单已创建并绑定产品资料页。' : '订单已创建，当前产品未建档，状态为未发图。',
    };
  }

  private resolveApplyLink(
    item: OrderImportPreviewItemRecord,
    request: { confirmedCustomerId?: string; confirmedProductId?: string },
  ): {
    product?: HubProductModel;
    customer?: HubCustomer;
    result?: Pick<OrderImportApplyItemRecord, 'result' | 'message' | 'errorMessage'>;
  } {
    if (item.action === 'needs_customer_confirmation') {
      const confirmedProductId = cleanText(request.confirmedProductId);
      const confirmedCustomerId = cleanText(request.confirmedCustomerId);
      if (!confirmedCustomerId || !confirmedProductId) {
        return {
          result: {
            result: 'needs_confirmation',
            message: '该型号存在多个客户，请确认客户和产品资料页。',
          },
        };
      }
      const product = this.drawingRepository.readProducts().find((entry) => entry.productId === confirmedProductId);
      const customer = this.drawingRepository.readCustomers().find((entry) => entry.customerId === confirmedCustomerId);
      if (!product || !customer || product.customerId !== customer.customerId) {
        return { result: { result: 'error', message: '所选客户或产品不存在。', errorMessage: '所选客户或产品不存在。' } };
      }
      const normalized = product.normalizedProductModel ?? normalizeOrderProductModel(product.productModel);
      if (normalized !== item.normalizedProductModel) {
        return {
          result: {
            result: 'error',
            message: '所选产品型号与订单型号不一致。',
            errorMessage: '所选产品型号与订单型号不一致。',
          },
        };
      }
      return { product, customer };
    }

    if (item.matchedProductId) {
      const product = this.drawingRepository.readProducts().find((entry) => entry.productId === item.matchedProductId);
      const customer = product
        ? this.drawingRepository.readCustomers().find((entry) => entry.customerId === product.customerId)
        : undefined;
      return { product, customer };
    }

    return {};
  }

  private resolveProduct(normalizedProductModel: string): ProductResolution {
    const products = this.drawingRepository.readProducts().filter((product) => (
      (product.normalizedProductModel ?? normalizeOrderProductModel(product.productModel)) === normalizedProductModel
    ));
    if (!products.length) return { status: 'product_not_found' };
    if (products.length > 1) return { status: 'ambiguous', products };
    const product = products[0];
    const customer = this.drawingRepository.readCustomers().find((item) => item.customerId === product.customerId);
    if (!customer) return { status: 'customer_not_found', product };
    return { status: 'found', product, customer };
  }

  private async hasActiveOrder(scope: 'today' | 'week', normalizedProductModel: string) {
    const orders = await this.orderRepository.listOrders({
      scope,
      completionStatus: 'pending',
    });
    return orders.some((order) => order.normalizedProductModel === normalizedProductModel);
  }

  private actionForResolution(status: ProductResolutionStatus): OrderImportAction {
    if (status === 'found') return 'create_order';
    if (status === 'ambiguous') return 'needs_customer_confirmation';
    if (status === 'product_not_found') return 'product_not_found';
    if (status === 'customer_not_found') return 'product_not_found';
    return 'error';
  }

  private messageForAction(action: OrderImportAction) {
    if (action === 'create_order') return '可创建订单。';
    if (action === 'needs_customer_confirmation') return '同型号存在多个客户，请确认后导入。';
    if (action === 'product_not_found') return '产品未建档，将以未发图订单导入。';
    if (action === 'already_active') return '同范围内已有进行中订单。';
    if (action === 'duplicate_in_file') return '文件内重复型号。';
    return '该行无法导入。';
  }

  private makePreviewItem(input: {
    importItemId: string;
    rowNumber: number;
    rawProductModel: string;
    productModel: string;
    normalizedProductModel: string;
    action: OrderImportAction;
    resolutionStatus: ProductResolutionStatus;
    productionStatus: OrderProductionStatus;
    product?: HubProductModel;
    customer?: HubCustomer;
    message?: string;
    errorMessage?: string;
  }): OrderImportPreviewItemRecord {
    return {
      importItemId: input.importItemId,
      rowNumber: input.rowNumber,
      rawProductModel: input.rawProductModel,
      productModel: input.productModel,
      normalizedProductModel: input.normalizedProductModel,
      productResolutionStatus: input.resolutionStatus,
      matchedCustomerId: input.customer?.customerId ?? null,
      matchedCustomerName: input.customer?.customerName ?? null,
      matchedProductId: input.product?.productId ?? null,
      recommendedProductionStatus: input.productionStatus,
      action: input.action,
      message: input.message,
      errorMessage: input.errorMessage,
    };
  }

  private assertRequestItemsBelongToBatch(batch: OrderImportBatchRecord, items: Array<{ importItemId: string }>) {
    const allowed = new Set(batch.items.map((item) => item.importItemId));
    if (items.some((item) => !allowed.has(item.importItemId))) {
      throw new BadRequestException('订单导入项不属于当前预览批次。');
    }
  }

  private deriveBatchStatus(items: OrderImportApplyItemRecord[]): OrderImportBatchRecord['status'] {
    const created = items.filter((item) => item.result === 'created').length;
    const blocking = items.filter((item) => item.result === 'error' || item.result === 'needs_confirmation').length;
    if (blocking > 0 && created === 0) return 'failed';
    if (blocking > 0) return 'partially_applied';
    return 'completed';
  }

  private isExpired(batch: OrderImportBatchRecord) {
    return Boolean(batch.expiresAt) && new Date(batch.expiresAt as string).getTime() <= Date.now();
  }

  private isCompleted(batch: OrderImportBatchRecord) {
    return (batch.status === 'completed' || batch.status === 'partially_applied') && Boolean(batch.applyItems?.length);
  }

  private toSafePreviewResponse(batch: OrderImportBatchRecord) {
    return {
      importBatchId: batch.importBatchId,
      scope: batch.scope,
      status: batch.status,
      totalRows: batch.totalRows,
      summary: {
        createOrder: batch.createOrderCount,
        alreadyActive: batch.alreadyActiveCount,
        duplicateInFile: batch.duplicateInFileCount,
        needsConfirmation: batch.needsConfirmationCount,
        productNotFound: batch.productNotFoundCount,
        error: batch.errorCount,
      },
      expiresAt: batch.expiresAt,
      items: batch.items.map((item) => clone(item)),
    };
  }

  private toSafeApplyResponse(batch: OrderImportBatchRecord) {
    const applyItems = batch.applyItems ?? [];
    return {
      importBatchId: batch.importBatchId,
      scope: batch.scope,
      status: batch.status,
      summary: {
        created: applyItems.filter((item) => item.result === 'created').length,
        skippedDuplicate: applyItems.filter((item) => item.result === 'skipped_duplicate').length,
        alreadyActive: applyItems.filter((item) => item.result === 'already_active').length,
        needsConfirmation: applyItems.filter((item) => item.result === 'needs_confirmation').length,
        skippedByUser: applyItems.filter((item) => item.result === 'skipped_by_user').length,
        error: applyItems.filter((item) => item.result === 'error').length,
      },
      appliedAt: batch.appliedAt,
      items: applyItems.map((item) => clone(item)),
    };
  }

  private async writeBatchAudit(action: string, batch: OrderImportBatchRecord, op: { operatorId: string; operatorName: string }) {
    await this.auditService?.tryCreate({
      entityType: 'import' as any,
      entityId: batch.importBatchId,
      action: action as any,
      after: {
        importBatchId: batch.importBatchId,
        scope: batch.scope,
        totalRows: batch.totalRows,
        status: batch.status,
        operatorId: op.operatorId,
        operatorName: op.operatorName,
        createdAt: new Date().toISOString(),
      },
      operatorId: op.operatorId,
      operatorName: op.operatorName,
      operatorRole: 'local',
      message: action,
    });
  }
}
