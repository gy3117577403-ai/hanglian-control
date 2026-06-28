import { Injectable } from '@nestjs/common';
import { OrderMetadataStore } from '../../document-hub/order-metadata.store';
import type { OrderRepository } from '../persistence.types';

@Injectable()
export class JsonOrderRepository implements OrderRepository {
  constructor(private readonly store: OrderMetadataStore) {}

  ensureInitialized = () => this.store.ensureInitialized();
  initializeFromSeedIfEmpty = () => this.store.initializeFromSeedIfEmpty();
  listOrders = (filters?: Parameters<OrderMetadataStore['listOrders']>[0]) => this.store.listOrders(filters);
  getOrderById = (orderId: string) => this.store.getOrderById(orderId);
  createOrder = (input: Parameters<OrderMetadataStore['createOrder']>[0]) => this.store.createOrder(input);
  createOrders = (inputs: Parameters<OrderMetadataStore['createOrders']>[0]) => this.store.createOrders(inputs);
  updateOrder = (orderId: string, patch: Parameters<OrderMetadataStore['updateOrder']>[1]) => this.store.updateOrder(orderId, patch);
  completeOrder = (orderId: string, operator?: string) => this.store.completeOrder(orderId, operator);
  restoreOrder = (orderId: string, operator?: string, productionStatus?: Parameters<OrderMetadataStore['restoreOrder']>[2]) => this.store.restoreOrder(orderId, operator, productionStatus);
  saveImportBatch = (batch: Parameters<OrderMetadataStore['saveImportBatch']>[0]) => this.store.saveImportBatch(batch);
  getImportBatch = (importBatchId: string) => this.store.getImportBatch(importBatchId);
  listImportBatches = () => this.store.listImportBatches();
  updateImportBatch = (importBatchId: string, patch: Parameters<OrderMetadataStore['updateImportBatch']>[1]) => this.store.updateImportBatch(importBatchId, patch);
  getSafeSummary = () => this.store.getSafeSummary();
}
