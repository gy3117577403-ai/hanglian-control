import { Injectable } from '@nestjs/common';
import { DrawingMetadataStore } from '../../document-hub/drawing-metadata.store';
import type { DrawingRepository } from '../persistence.types';

@Injectable()
export class JsonDrawingRepository implements DrawingRepository {
  constructor(private readonly store: DrawingMetadataStore) {}

  ensureInitialized = () => this.store.ensureInitialized();
  readCustomers = () => this.store.readCustomers();
  writeCustomers = (customers: Parameters<DrawingMetadataStore['writeCustomers']>[0]) => this.store.writeCustomers(customers);
  readProducts = () => this.store.readProducts();
  writeProducts = (products: Parameters<DrawingMetadataStore['writeProducts']>[0]) => this.store.writeProducts(products);
  readModuleState = () => this.store.readModuleState();
  writeModuleState = (state: Parameters<DrawingMetadataStore['writeModuleState']>[0]) => this.store.writeModuleState(state);
  readDetails = () => this.store.readDetails();
  writeDetails = (details: Parameters<DrawingMetadataStore['writeDetails']>[0]) => this.store.writeDetails(details);
  readTrash = () => this.store.readTrash();
  writeTrash = (trash: Parameters<DrawingMetadataStore['writeTrash']>[0]) => this.store.writeTrash(trash);
  upsertDetail = (detail: Parameters<DrawingMetadataStore['upsertDetail']>[0]) => this.store.upsertDetail(detail);
  readImportRecords = () => this.store.readImportRecords();
  writeImportRecords = (records: Parameters<DrawingMetadataStore['writeImportRecords']>[0]) => this.store.writeImportRecords(records);
  upsertImportBatch = (batch: Parameters<DrawingMetadataStore['upsertImportBatch']>[0]) => this.store.upsertImportBatch(batch);
  makeProductId = (customerId: string, productModel: string) => this.store.makeProductId(customerId, productModel);
  makeProductDetail = (customer: Parameters<DrawingMetadataStore['makeProductDetail']>[0], product: Parameters<DrawingMetadataStore['makeProductDetail']>[1]) => this.store.makeProductDetail(customer, product);
  clone = <T>(value: T) => this.store.clone(value);
  rollbackNewProduct = (productId: string) => this.store.rollbackNewProduct(productId);
}
