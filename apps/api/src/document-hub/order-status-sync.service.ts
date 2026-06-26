import { BadRequestException, Inject, Injectable, Optional } from '@nestjs/common';
import type { ProductDocument } from '../common/types/production.types';
import { AuditService } from '../audit/audit.service';
import { DocumentsService } from '../documents/documents.service';
import { DRAWING_REPOSITORY, ORDER_REPOSITORY } from '../persistence/persistence.tokens';
import type { DrawingRepository, OrderRepository } from '../persistence/persistence.types';
import {
  OrderProductionStatus,
  ProductionOrderRecord,
} from './order-metadata.store';

function documentId(document: ProductDocument) {
  return document.documentId ?? document.id;
}

function isActiveOriginalDocument(document: ProductDocument) {
  const raw = document as ProductDocument & { deleted?: boolean; deletedAt?: string | null };
  return (
    document.documentType === 'drawing_pdf' &&
    document.archived !== true &&
    raw.deleted !== true &&
    !raw.deletedAt &&
    document.documentStatus !== 'expired'
  );
}

function operator(input?: { operatorId?: string; operatorName?: string }) {
  return {
    operatorId: input?.operatorId?.trim() || 'local-user',
    operatorName: input?.operatorName?.trim() || '本地操作员',
  };
}

@Injectable()
export class OrderStatusSyncService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepository: OrderRepository,
    @Inject(DRAWING_REPOSITORY) private readonly drawingRepository: DrawingRepository,
    private readonly documentsService: DocumentsService,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  async hasEffectiveOriginalDrawing(productId: string) {
    const detail = (await this.drawingRepository.readDetails()).find((item) => item.product.productId === productId);
    const moduleHasOriginal = detail?.modules
      .find((module) => module.moduleKey === 'original_drawing')
      ?.items
      .some((item) => !item.deletedAt && item.documentStatus !== 'expired') === true;
    if (moduleHasOriginal) return true;

    const documents = await this.documentsService.findAll({ productId, documentType: 'drawing_pdf' }) as ProductDocument[];
    return documents.some((document) => isActiveOriginalDocument(document));
  }

  async deriveProductionStatus(input: {
    linkedProductId?: string | null;
    previousStatus?: OrderProductionStatus;
    desiredStatus?: OrderProductionStatus;
    preserveBack?: boolean;
  }): Promise<OrderProductionStatus> {
    if (!input.linkedProductId) return 'no_drawing';
    const hasOriginal = await this.hasEffectiveOriginalDrawing(input.linkedProductId);
    if (!hasOriginal) return 'no_drawing';
    if (input.desiredStatus === 'back') return 'back';
    if (input.preserveBack && input.previousStatus === 'back') return 'back';
    return 'front';
  }

  async assertCanSetProductionStatus(order: ProductionOrderRecord, productionStatus: OrderProductionStatus) {
    if (productionStatus === 'no_drawing') return;
    if (!order.linkedProductId) {
      throw new BadRequestException('当前订单尚未绑定产品资料页，只能保持“未发图”状态。');
    }
    const hasOriginal = await this.hasEffectiveOriginalDrawing(order.linkedProductId);
    if (!hasOriginal) {
      throw new BadRequestException('当前产品尚无原图，只能保持“未发图”状态。');
    }
  }

  async syncOrdersForProduct(productId: string, input: {
    operatorId?: string;
    operatorName?: string;
    reason?: string;
  } = {}) {
    const hasOriginalDrawing = await this.hasEffectiveOriginalDrawing(productId);
    const activeOrders = await this.orderRepository.listOrders({
      linkedProductId: productId,
      completionStatus: 'pending',
    });
    const changedOrders: ProductionOrderRecord[] = [];
    const { operatorId, operatorName } = operator(input);

    for (const order of activeOrders) {
      const nextStatus = hasOriginalDrawing
        ? (order.productionStatus === 'no_drawing' ? 'front' : order.productionStatus)
        : 'no_drawing';
      if (nextStatus === order.productionStatus) continue;
      const updated = await this.orderRepository.updateOrder(order.orderId, {
        productionStatus: nextStatus,
      });
      if (!updated) continue;
      changedOrders.push(updated);
      await this.writeAudit('order_status_auto_synced', updated, {
        previousStatus: order.productionStatus,
        nextStatus,
        operatorId,
        operatorName,
        reason: input.reason,
      });
    }

    return {
      productId,
      hasOriginalDrawing,
      changedCount: changedOrders.length,
      changedOrders,
    };
  }

  async writeAudit(action: string, order: ProductionOrderRecord, extra: {
    previousStatus?: OrderProductionStatus;
    nextStatus?: OrderProductionStatus;
    importBatchId?: string | null;
    operatorId?: string;
    operatorName?: string;
    reason?: string;
  } = {}) {
    await this.auditService?.tryCreate({
      entityType: 'plan' as any,
      entityId: order.orderId,
      action: action as any,
      after: {
        orderId: order.orderId,
        productModel: order.productModel,
        linkedProductId: order.linkedProductId,
        customerId: order.customerId,
        previousStatus: extra.previousStatus,
        nextStatus: extra.nextStatus ?? order.productionStatus,
        importBatchId: extra.importBatchId ?? order.importBatchId,
        operatorId: extra.operatorId,
        operatorName: extra.operatorName,
        createdAt: new Date().toISOString(),
      },
      operatorId: extra.operatorId,
      operatorName: extra.operatorName,
      operatorRole: 'local',
      productId: order.linkedProductId ?? undefined,
      message: extra.reason ?? action,
    });
  }

  async activeOriginalDocumentIds(productId: string) {
    const detail = (await this.drawingRepository.readDetails()).find((item) => item.product.productId === productId);
    return detail?.modules
      .find((module) => module.moduleKey === 'original_drawing')
      ?.items
      .filter((item) => !item.deletedAt && item.documentStatus !== 'expired')
      .map((item) => item.itemId) ?? [];
  }

  async activeFormalOriginalDocumentIds(productId: string) {
    const documents = await this.documentsService.findAll({ productId, documentType: 'drawing_pdf' }) as ProductDocument[];
    return documents.filter(isActiveOriginalDocument).map(documentId);
  }
}
