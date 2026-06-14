import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { documentStatusLabelMap } from '../common/enums/production.enum';
import { evaluatePlanReadiness } from '../common/utils/readiness';
import { mockStore } from '../mock/production.mock';
import { LocalStorageService } from '../storage/local-storage.service';
import { includesKeyword, normalizeDocumentStatus, normalizeMaterialStatus, statusLabel } from './helpers/maintenance-normalizer';
import { assertFiniteNumber, assertIds } from './helpers/maintenance-validator';
import type { BulkStatusUpdateDto } from './dto/bulk-status-update.dto';
import type { MaintenanceQueryDto } from './dto/maintenance-query.dto';
import type { ReviewRecordDto } from './dto/review-record.dto';
import type { UpdateBackPackageDto } from './dto/update-back-package.dto';
import type { UpdateCustomerDto } from './dto/update-customer.dto';
import type { UpdateDocumentMaintenanceDto } from './dto/update-document-maintenance.dto';
import type { UpdateFrontParameterDto } from './dto/update-front-parameter.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import type { UpdateProductionPlanDto } from './dto/update-production-plan.dto';
import type {
  BackProcessPackageSeed,
  CustomerSeed,
  FrontProcessParameterSeed,
  ImportedBusinessDataSnapshot,
  MaintenanceEntityType,
  MaintenanceRecord,
  ProductDocument,
  ProductSeed,
  ProductionPlanMock,
} from '../common/types/production.types';

const operator = {
  operatorId: 'demo-maintainer',
  operatorName: '资料维护演示账号',
  operatorRole: '资料维护',
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function extra<T extends object>(value: T) {
  return value as T & Record<string, unknown>;
}

function docId(document: ProductDocument) {
  return document.documentId || document.id;
}

function versionStatus(plan: ProductionPlanMock): ProductionPlanMock['versionStatus'] {
  const danger = plan.front.parameterStatus === '失效'
    || plan.back.materialStatus === '失效'
    || plan.documents.some((document) => ['expired', 'missing', 'inconsistent'].includes(document.documentStatus ?? 'effective'));
  const warning = plan.front.parameterStatus === '待确认'
    || plan.back.materialStatus === '待确认'
    || plan.documents.some((document) => document.documentStatus === 'pending_review')
    || plan.confirmationStatus === '需复核';
  if (danger) return { status: '失效', message: '维护后存在失效或不一致资料，需复核。', redLine: true };
  if (warning) return { status: '待确认', message: '维护后存在待确认资料，需组长复核。', redLine: true };
  return { status: '有效', message: '维护后资料状态有效。', redLine: false };
}

function frontFromPlan(plan: ProductionPlanMock): FrontProcessParameterSeed {
  return {
    id: `MAINT-FRONT-${plan.productId}`,
    productId: plan.productId,
    wireLength: plan.front.wireLength,
    strippingLength: plan.front.strippingLength,
    terminalModel: plan.front.terminalModel,
    pullForceStandard: plan.front.pullForceStandard,
    crimpHeight: plan.front.crimpHeight,
    drawingVersion: plan.front.drawingVersion,
    parameterStatus: plan.front.parameterStatus,
  };
}

function backFromPlan(plan: ProductionPlanMock): BackProcessPackageSeed {
  return {
    id: `MAINT-BACK-${plan.productId}`,
    productId: plan.productId,
    connectorModel: plan.back.connectorModel,
    assemblyManual: plan.back.assemblyManual,
    pinMap: plan.back.pinMap,
    sop: plan.back.sop,
    finishedImageCount: plan.back.finishedImageCount,
    drawingVersion: plan.back.drawingVersion,
    sopVersion: plan.back.sopVersion,
    materialStatus: plan.back.materialStatus,
  };
}

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly localStorageService: LocalStorageService,
    private readonly auditService: AuditService,
  ) {}

  summary() {
    const documents = this.allDocuments();
    const history = this.localStorageService.readMaintenanceRecordsSync();
    const imports = this.localStorageService.readImportRecordsSync();
    return {
      customers: this.allCustomers().length,
      products: this.allProducts().length,
      productionPlans: mockStore.productionPlans.length,
      frontParameters: this.frontParameterRows().length,
      backPackages: this.backPackageRows().length,
      documents: documents.length,
      pendingReview: this.reviewQueue({}).length,
      expiredDocuments: documents.filter((document) => document.documentStatus === 'expired').length,
      inconsistentItems: documents.filter((document) => document.documentStatus === 'inconsistent').length,
      lastImportAt: imports[0]?.createdAt,
      lastMaintenanceAt: history[0]?.createdAt,
    };
  }

  customers(query: MaintenanceQueryDto) {
    const products = this.allProducts();
    return this.allCustomers()
      .map((customer) => ({
        id: customer.id,
        sales: customer.salesOwner,
        customerName: customer.name,
        customerShortName: extra(customer).customerShortName ?? customer.code,
        status: extra(customer).status ?? 'active',
        statusLabel: statusLabel(String(extra(customer).status ?? 'active')),
        productCount: products.filter((product) => product.customerId === customer.id).length,
        updatedAt: extra(customer).updatedAt ?? undefined,
        remark: extra(customer).remark ?? '',
      }))
      .filter((row) => !query.sales || row.sales === query.sales)
      .filter((row) => !query.status || row.status === query.status)
      .filter((row) => includesKeyword([row.sales, row.customerName, row.customerShortName, row.remark], query.keyword));
  }

  updateCustomer(id: string, dto: UpdateCustomerDto) {
    const snapshot = this.snapshot();
    const customer = this.ensureCustomerSnapshot(id, snapshot);
    const before = clone(customer);
    if (dto.customerName) customer.name = dto.customerName;
    if (dto.sales) customer.salesOwner = dto.sales;
    if (dto.customerShortName) extra(customer).customerShortName = dto.customerShortName;
    if (dto.status) extra(customer).status = dto.status;
    if (dto.remark !== undefined) extra(customer).remark = dto.remark;
    extra(customer).updatedAt = new Date().toISOString();
    this.persistSnapshot(snapshot);
    return this.record('customer', id, 'customer_updated', before, customer, dto.remark);
  }

  products(query: MaintenanceQueryDto) {
    const customers = this.allCustomers();
    return this.allProducts()
      .map((product) => {
        const customer = customers.find((item) => item.id === product.customerId);
        return {
          id: product.id,
          customerId: product.customerId,
          customer: customer?.name ?? '未知客户',
          productCode: product.productCode,
          productName: product.productName,
          productVersion: product.currentVersion,
          productCategory: extra(product).productCategory ?? product.processSegment,
          processSegment: product.processSegment,
          status: extra(product).status ?? 'active',
          statusLabel: statusLabel(String(extra(product).status ?? 'active')),
          aliases: extra(product).aliases ?? [],
          updatedAt: extra(product).updatedAt ?? undefined,
          remark: extra(product).remark ?? '',
        };
      })
      .filter((row) => !query.customerId || row.customerId === query.customerId)
      .filter((row) => !query.status || row.status === query.status)
      .filter((row) => includesKeyword([row.customer, row.productCode, row.productName, row.productVersion, row.productCategory, row.aliases], query.keyword));
  }

  updateProduct(id: string, dto: UpdateProductDto) {
    const snapshot = this.snapshot();
    const product = this.ensureProductSnapshot(id, snapshot);
    const before = clone(product);
    if (dto.productName) product.productName = dto.productName;
    if (dto.productVersion) product.currentVersion = dto.productVersion;
    if (dto.productCategory) extra(product).productCategory = dto.productCategory;
    if (dto.status) extra(product).status = dto.status;
    if (dto.aliases) extra(product).aliases = dto.aliases;
    if (dto.remark !== undefined) extra(product).remark = dto.remark;
    extra(product).updatedAt = new Date().toISOString();
    for (const plan of mockStore.productionPlans.filter((item) => item.productId === id)) {
      plan.productName = product.productName;
      plan.productVersion = product.currentVersion;
    }
    this.persistSnapshot(snapshot);
    return this.record('product', id, 'product_updated', before, product, dto.remark);
  }

  productionPlans(query: MaintenanceQueryDto) {
    const plans = query.scope === 'today'
      ? mockStore.findPlansByScope('today')
      : query.scope === 'week' || !query.scope
        ? mockStore.findPlansByScope('week')
        : mockStore.productionPlans;
    return plans
      .map((plan) => ({
        id: plan.id,
        planDate: plan.date,
        weekPlanCode: plan.weekPlanNo,
        sales: plan.sales,
        customerId: plan.customerId,
        customer: plan.customer,
        productId: plan.productId,
        productCode: plan.productCode,
        productName: plan.productName,
        processSegment: plan.segment,
        plannedQuantity: plan.plannedQuantity,
        completedQuantity: plan.completedQuantity,
        planStatus: plan.status,
        confirmStatus: plan.confirmationStatus,
        materialCompleteness: plan.materialCompleteness,
        responsiblePerson: plan.owner,
        remark: extra(plan).remark ?? '',
      }))
      .filter((row) => !query.customerId || row.customerId === query.customerId)
      .filter((row) => !query.productId || row.productId === query.productId)
      .filter((row) => !query.processSegment || row.processSegment === query.processSegment)
      .filter((row) => !query.status || row.planStatus === query.status)
      .filter((row) => !query.confirmStatus || row.confirmStatus === query.confirmStatus)
      .filter((row) => includesKeyword([row.weekPlanCode, row.customer, row.productCode, row.productName, row.responsiblePerson], query.keyword));
  }

  updateProductionPlan(id: string, dto: UpdateProductionPlanDto) {
    assertFiniteNumber(dto.plannedQuantity, '计划数量');
    assertFiniteNumber(dto.completedQuantity, '完成数量');
    const snapshot = this.snapshot();
    const plan = this.ensurePlanSnapshot(id, snapshot);
    const before = clone(plan);
    if (dto.planDate) plan.date = dto.planDate;
    if (dto.weekPlanCode) plan.weekPlanNo = dto.weekPlanCode;
    if (dto.sales) plan.sales = dto.sales;
    if (dto.plannedQuantity !== undefined) plan.plannedQuantity = Number(dto.plannedQuantity);
    if (dto.completedQuantity !== undefined) plan.completedQuantity = Number(dto.completedQuantity);
    if (dto.planStatus) plan.status = dto.planStatus;
    if (dto.responsiblePerson) plan.owner = dto.responsiblePerson;
    if (dto.remark !== undefined) extra(plan).remark = dto.remark;
    this.decoratePlan(plan);
    mockStore.updatePlan(id, plan);
    this.persistSnapshot(snapshot);
    return this.record('production_plan', id, 'plan_updated', before, plan, dto.remark);
  }

  frontParameters(query: MaintenanceQueryDto) {
    return this.frontParameterRows()
      .filter((row) => !query.productId || row.productId === query.productId)
      .filter((row) => !query.status || row.parameterStatus === query.status || row.status === query.status)
      .filter((row) => includesKeyword([row.customer, row.productCode, row.productVersion, row.wireLength, row.terminalModel, row.drawingVersion], query.keyword));
  }

  updateFrontParameter(id: string, dto: UpdateFrontParameterDto) {
    const snapshot = this.snapshot();
    const front = this.ensureFrontSnapshot(id, snapshot);
    const before = clone(front);
    if (dto.cutLength !== undefined) front.wireLength = dto.cutLength;
    if (dto.stripLength !== undefined) front.strippingLength = dto.stripLength;
    if (dto.terminalModel !== undefined) front.terminalModel = dto.terminalModel;
    if (dto.pullForceStandard !== undefined) front.pullForceStandard = dto.pullForceStandard;
    if (dto.crimpHeight !== undefined) front.crimpHeight = dto.crimpHeight;
    if (dto.drawingVersion !== undefined) front.drawingVersion = dto.drawingVersion;
    if (dto.parameterStatus !== undefined) front.parameterStatus = normalizeMaterialStatus(dto.parameterStatus);
    if (dto.remark !== undefined) extra(front).remark = dto.remark;
    this.refreshPlansForProduct(front.productId, snapshot);
    this.persistSnapshot(snapshot);
    return this.record('front_parameter', front.productId, 'front_parameter_updated', before, front, dto.remark);
  }

  backPackages(query: MaintenanceQueryDto) {
    return this.backPackageRows()
      .filter((row) => !query.productId || row.productId === query.productId)
      .filter((row) => !query.status || row.materialStatus === query.status || row.status === query.status)
      .filter((row) => includesKeyword([row.customer, row.productCode, row.productVersion, row.connectorModel, row.pinMap, row.sop], query.keyword));
  }

  updateBackPackage(id: string, dto: UpdateBackPackageDto) {
    assertFiniteNumber(dto.finishedDetailImageCount, '成品细节图数量');
    const snapshot = this.snapshot();
    const back = this.ensureBackSnapshot(id, snapshot);
    const before = clone(back);
    if (dto.connectorModel !== undefined) back.connectorModel = dto.connectorModel;
    if (dto.connectorManual !== undefined) back.assemblyManual = dto.connectorManual;
    if (dto.pinoutDiagram !== undefined) back.pinMap = dto.pinoutDiagram;
    if (dto.processSop !== undefined) back.sop = dto.processSop;
    if (dto.finishedDetailImageCount !== undefined) back.finishedImageCount = Number(dto.finishedDetailImageCount);
    if (dto.drawingVersion !== undefined) back.drawingVersion = dto.drawingVersion;
    if (dto.sopVersion !== undefined) back.sopVersion = dto.sopVersion;
    if (dto.packageStatus !== undefined) back.materialStatus = normalizeMaterialStatus(dto.packageStatus);
    if (dto.remark !== undefined) extra(back).remark = dto.remark;
    this.refreshPlansForProduct(back.productId, snapshot);
    this.persistSnapshot(snapshot);
    return this.record('back_package', back.productId, 'back_package_updated', before, back, dto.remark);
  }

  documents(query: MaintenanceQueryDto) {
    return this.allDocuments()
      .map((document) => {
        const plan = document.planId ? mockStore.findPlanById(document.planId) : mockStore.productionPlans.find((item) => item.productId === document.productId);
        return {
          id: docId(document),
          title: document.title,
          customerId: plan?.customerId,
          customer: plan?.customer ?? '未知客户',
          productId: document.productId,
          productCode: plan?.productCode ?? '',
          documentType: document.documentType,
          version: document.version,
          status: document.documentStatus,
          statusLabel: document.status,
          source: document.source,
          requiredForProcess: document.requiredForProcess,
          fileHealth: document.source === 'manual_upload' ? '本地文件' : '演示资料',
          updatedAt: document.updatedAt,
          remark: document.remark ?? '',
          raw: document,
        };
      })
      .filter((row) => !query.productId || row.productId === query.productId)
      .filter((row) => !query.customerId || row.customerId === query.customerId)
      .filter((row) => !query.documentType || row.documentType === query.documentType)
      .filter((row) => !query.status || row.status === query.status)
      .filter((row) => !query.source || row.source === query.source)
      .filter((row) => !query.requiredForProcess || row.requiredForProcess === query.requiredForProcess)
      .filter((row) => includesKeyword([row.title, row.customer, row.productCode, row.version, row.remark], query.keyword));
  }

  updateDocument(id: string, dto: UpdateDocumentMaintenanceDto) {
    const document = this.findDocument(id);
    if (!document) throw new NotFoundException('未找到文件资料。');
    const before = clone(document);
    if (dto.title !== undefined) document.title = dto.title;
    if (dto.version !== undefined) document.version = dto.version;
    if (dto.status !== undefined) {
      document.documentStatus = normalizeDocumentStatus(dto.status);
      document.status = documentStatusLabelMap[document.documentStatus];
    }
    if (dto.requiredForProcess !== undefined) document.requiredForProcess = dto.requiredForProcess;
    if (dto.keywords !== undefined) document.keywords = dto.keywords;
    if (dto.remark !== undefined) document.remark = dto.remark;
    document.updatedAt = new Date().toISOString();
    this.persistDocument(document);
    return this.record('document', id, 'document_updated', before, document, dto.remark);
  }

  setDocumentEffective(id: string, payload: { reason?: string } = {}) {
    const document = this.findDocument(id);
    if (!document) throw new NotFoundException('未找到文件资料。');
    const before = clone(document);
    const key = document.versionGroupKey ?? `${document.productId}::${document.documentType}::${document.requiredForProcess}`;
    for (const item of this.allDocuments()) {
      const itemKey = item.versionGroupKey ?? `${item.productId}::${item.documentType}::${item.requiredForProcess}`;
      if (itemKey !== key || docId(item) === docId(document)) continue;
      if (item.documentStatus === 'effective') {
        item.documentStatus = 'expired';
        item.status = documentStatusLabelMap.expired;
        item.updatedAt = new Date().toISOString();
        this.persistDocument(item);
      }
    }
    document.documentStatus = 'effective';
    document.status = documentStatusLabelMap.effective;
    document.updatedAt = new Date().toISOString();
    document.effectiveDate = document.updatedAt.slice(0, 10);
    this.persistDocument(document);
    return this.record('document', id, 'document_set_effective', before, document, payload.reason);
  }

  bulkStatus(dto: BulkStatusUpdateDto) {
    assertIds(dto.ids);
    const results: MaintenanceRecord[] = [];
    for (const id of dto.ids) {
      if (dto.entityType === 'product') results.push(this.updateProduct(id, { status: dto.status as UpdateProductDto['status'], remark: dto.reason }));
      if (dto.entityType === 'production_plan') results.push(this.updateProductionPlan(id, { planStatus: dto.status as UpdateProductionPlanDto['planStatus'], remark: dto.reason }));
      if (dto.entityType === 'front_parameter') results.push(this.updateFrontParameter(id, { parameterStatus: dto.status as UpdateFrontParameterDto['parameterStatus'], remark: dto.reason }));
      if (dto.entityType === 'back_package') results.push(this.updateBackPackage(id, { packageStatus: dto.status as UpdateBackPackageDto['packageStatus'], remark: dto.reason }));
      if (dto.entityType === 'document') results.push(this.updateDocument(id, { status: normalizeDocumentStatus(dto.status), remark: dto.reason }));
    }
    return {
      success: true,
      message: '批量状态更新完成。',
      total: results.length,
      records: results,
    };
  }

  reviewQueue(_query: MaintenanceQueryDto) {
    const rows: Array<Record<string, unknown>> = [];
    for (const document of this.documents({})) {
      if (['pending_review', 'expired', 'inconsistent', 'missing'].includes(String(document.status))) {
        rows.push({
          id: `document:${document.id}`,
          type: document.status === 'pending_review' ? '资料待确认' : document.status === 'missing' ? '文件缺失' : document.status === 'inconsistent' ? '资料不一致' : '资料已失效',
          customer: document.customer,
          product: document.productCode,
          planId: document.raw.planId,
          entityType: 'document',
          entityId: document.id,
          message: `${document.title} ${document.version} ${document.statusLabel}`,
          recommendedAction: '打开资料维护状态，确认是否设为当前有效或继续待确认。',
          createdAt: document.updatedAt,
        });
      }
    }
    for (const plan of mockStore.productionPlans) {
      if (plan.materialCompleteness < 90) {
        rows.push({
          id: `plan:${plan.id}`,
          type: '计划资料完整度低',
          customer: plan.customer,
          product: plan.productCode,
          planId: plan.id,
          entityType: 'production_plan',
          entityId: plan.id,
          message: `${plan.weekPlanNo} 资料完整度 ${plan.materialCompleteness}%`,
          recommendedAction: '补齐前段参数、后段资料包或文件资料后重新检查。',
          createdAt: new Date().toISOString(),
        });
      }
    }
    for (const record of this.localStorageService.readImportRecordsSync().filter((item) => item.warningRows > 0)) {
      rows.push({
        id: `import:${record.id}`,
        type: '导入警告',
        customer: '-',
        product: record.importTypeLabel,
        entityType: 'import_record',
        entityId: record.id,
        message: `${record.fileName} 存在 ${record.warningRows} 行警告`,
        recommendedAction: '查看导入历史，确认警告行是否需要补充资料。',
        createdAt: record.createdAt,
      });
    }
    return rows.slice(0, 120);
  }

  resolveReviewItem(id: string, dto: ReviewRecordDto) {
    const [entityType, entityId] = id.split(':');
    if (entityType === 'document') {
      const status = dto.action === 'mark_reviewed' ? 'effective' : dto.action === 'mark_pending' ? 'pending_review' : 'inconsistent';
      return this.updateDocument(entityId, { status, remark: dto.remark ?? '复核队列处理' });
    }
    const record = this.record('review_queue', id, 'review_resolved', { id }, { id, action: dto.action }, dto.remark);
    return { success: true, record };
  }

  history(query: MaintenanceQueryDto) {
    const limit = Math.min(Math.max(Number(query.limit ?? 100), 1), 500);
    return this.localStorageService.readMaintenanceRecordsSync()
      .filter((record) => !query.entityType || record.entityType === query.entityType)
      .filter((record) => !query.entityId || record.entityId === query.entityId)
      .filter((record) => !query.operatorId || record.operatorId === query.operatorId)
      .filter((record) => includesKeyword([record.entityType, record.action, record.reason, record.operatorName], query.keyword))
      .slice(0, limit);
  }

  historyDetail(id: string) {
    const record = this.localStorageService.readMaintenanceRecordsSync().find((item) => item.maintenanceId === id);
    if (!record) throw new NotFoundException('未找到维护记录。');
    return record;
  }

  private allCustomers() {
    const snapshot = this.snapshot();
    const byId = new Map<string, CustomerSeed>();
    for (const customer of mockStore.customers) byId.set(customer.id, clone(customer));
    for (const customer of snapshot.customers) byId.set(customer.id, clone(customer));
    return Array.from(byId.values());
  }

  private allProducts() {
    const snapshot = this.snapshot();
    const byId = new Map<string, ProductSeed>();
    for (const product of mockStore.products) byId.set(product.id, clone(product));
    for (const product of snapshot.products) byId.set(product.id, clone(product));
    return Array.from(byId.values());
  }

  private frontParameterRows() {
    const customers = this.allCustomers();
    const products = this.allProducts();
    const byProduct = new Map<string, FrontProcessParameterSeed>();
    for (const plan of mockStore.productionPlans) byProduct.set(plan.productId, frontFromPlan(plan));
    for (const front of this.snapshot().frontParameters) byProduct.set(front.productId, clone(front));
    return Array.from(byProduct.values()).map((front) => {
      const product = products.find((item) => item.id === front.productId);
      const customer = customers.find((item) => item.id === product?.customerId);
      return {
        id: front.productId,
        customerId: customer?.id,
        customer: customer?.name ?? '未知客户',
        productId: front.productId,
        productCode: product?.productCode ?? '',
        productVersion: product?.currentVersion ?? '',
        wireLength: front.wireLength,
        strippingLength: front.strippingLength,
        terminalModel: front.terminalModel,
        pullForceStandard: front.pullForceStandard,
        crimpHeight: front.crimpHeight,
        drawingVersion: front.drawingVersion,
        parameterStatus: front.parameterStatus,
        status: front.parameterStatus,
        remark: extra(front).remark ?? '',
      };
    });
  }

  private backPackageRows() {
    const customers = this.allCustomers();
    const products = this.allProducts();
    const byProduct = new Map<string, BackProcessPackageSeed>();
    for (const plan of mockStore.productionPlans) byProduct.set(plan.productId, backFromPlan(plan));
    for (const back of this.snapshot().backPackages) byProduct.set(back.productId, clone(back));
    return Array.from(byProduct.values()).map((back) => {
      const product = products.find((item) => item.id === back.productId);
      const customer = customers.find((item) => item.id === product?.customerId);
      return {
        id: back.productId,
        customerId: customer?.id,
        customer: customer?.name ?? '未知客户',
        productId: back.productId,
        productCode: product?.productCode ?? '',
        productVersion: product?.currentVersion ?? '',
        connectorModel: back.connectorModel,
        assemblyManual: back.assemblyManual,
        pinMap: back.pinMap,
        sop: back.sop,
        finishedImageCount: back.finishedImageCount,
        drawingVersion: back.drawingVersion,
        sopVersion: back.sopVersion,
        materialStatus: back.materialStatus,
        status: back.materialStatus,
        remark: extra(back).remark ?? '',
      };
    });
  }

  private allDocuments() {
    const byId = new Map<string, ProductDocument>();
    for (const plan of mockStore.productionPlans) {
      for (const document of plan.documents) byId.set(docId(document), document);
    }
    for (const document of this.localStorageService.readDocumentsSync()) byId.set(docId(document), document);
    return Array.from(byId.values());
  }

  private findDocument(id: string) {
    return this.allDocuments().find((document) => docId(document) === id);
  }

  private persistDocument(document: ProductDocument) {
    if (document.source === 'manual_upload') {
      this.localStorageService.upsertDocumentSync(document);
      return;
    }
    const snapshot = this.snapshot();
    const planId = document.planId ?? mockStore.productionPlans.find((plan) => plan.productId === document.productId)?.id;
    if (!planId) return;
    const plan = this.ensurePlanSnapshot(planId, snapshot);
    const index = plan.documents.findIndex((item) => docId(item) === docId(document));
    if (index >= 0) plan.documents[index] = document;
    else plan.documents.push(document);
    this.decoratePlan(plan);
    this.persistSnapshot(snapshot);
  }

  private ensureCustomerSnapshot(id: string, snapshot: ImportedBusinessDataSnapshot) {
    let customer = snapshot.customers.find((item) => item.id === id);
    if (customer) return customer;
    const source = mockStore.customers.find((item) => item.id === id);
    if (!source) throw new NotFoundException('未找到客户。');
    customer = clone(source);
    snapshot.customers.push(customer);
    return customer;
  }

  private ensureProductSnapshot(id: string, snapshot: ImportedBusinessDataSnapshot) {
    let product = snapshot.products.find((item) => item.id === id);
    if (product) return product;
    const source = mockStore.products.find((item) => item.id === id);
    if (!source) throw new NotFoundException('未找到产品。');
    product = clone(source);
    snapshot.products.push(product);
    return product;
  }

  private ensurePlanSnapshot(id: string, snapshot: ImportedBusinessDataSnapshot) {
    let plan = snapshot.productionPlans.find((item) => item.id === id);
    if (plan) return plan;
    const source = mockStore.findPlanById(id);
    if (!source) throw new NotFoundException('未找到生产计划。');
    plan = clone(source);
    snapshot.productionPlans.push(plan);
    return plan;
  }

  private ensureFrontSnapshot(productId: string, snapshot: ImportedBusinessDataSnapshot) {
    let front = snapshot.frontParameters.find((item) => item.productId === productId);
    if (front) return front;
    const plan = mockStore.productionPlans.find((item) => item.productId === productId);
    if (!plan) throw new NotFoundException('未找到前段参数。');
    front = frontFromPlan(plan);
    snapshot.frontParameters.push(front);
    return front;
  }

  private ensureBackSnapshot(productId: string, snapshot: ImportedBusinessDataSnapshot) {
    let back = snapshot.backPackages.find((item) => item.productId === productId);
    if (back) return back;
    const plan = mockStore.productionPlans.find((item) => item.productId === productId);
    if (!plan) throw new NotFoundException('未找到后段资料包。');
    back = backFromPlan(plan);
    snapshot.backPackages.push(back);
    return back;
  }

  private refreshPlansForProduct(productId: string, snapshot: ImportedBusinessDataSnapshot) {
    const front = snapshot.frontParameters.find((item) => item.productId === productId);
    const back = snapshot.backPackages.find((item) => item.productId === productId);
    for (const livePlan of mockStore.productionPlans.filter((item) => item.productId === productId)) {
      const plan = this.ensurePlanSnapshot(livePlan.id, snapshot);
      if (front) {
        plan.front = {
          wireLength: front.wireLength,
          strippingLength: front.strippingLength,
          terminalModel: front.terminalModel,
          pullForceStandard: front.pullForceStandard,
          crimpHeight: front.crimpHeight,
          drawingVersion: front.drawingVersion,
          parameterStatus: front.parameterStatus,
        };
      }
      if (back) {
        plan.back = {
          connectorModel: back.connectorModel,
          assemblyManual: back.assemblyManual,
          pinMap: back.pinMap,
          sop: back.sop,
          finishedImageCount: back.finishedImageCount,
          drawingVersion: back.drawingVersion,
          sopVersion: back.sopVersion,
          materialStatus: back.materialStatus,
        };
      }
      this.decoratePlan(plan);
      mockStore.updatePlan(plan.id, plan);
    }
  }

  private decoratePlan(plan: ProductionPlanMock) {
    plan.versionStatus = versionStatus(plan);
    plan.readiness = evaluatePlanReadiness(plan);
    plan.materialCompleteness = plan.readiness.score;
  }

  private snapshot() {
    return this.localStorageService.readImportedBusinessDataSync();
  }

  private persistSnapshot(snapshot: ImportedBusinessDataSnapshot) {
    snapshot.updatedAt = new Date().toISOString();
    this.localStorageService.writeImportedBusinessDataSync(snapshot);
    mockStore.mergeImportedBusinessData(snapshot);
  }

  private record(entityType: MaintenanceEntityType, entityId: string, action: string, before: unknown, after: unknown, reason?: string) {
    const record: MaintenanceRecord = {
      maintenanceId: `MAINT-${Date.now()}-${randomUUID()}`,
      entityType,
      entityId,
      action,
      before,
      after,
      reason,
      ...operator,
      createdAt: new Date().toISOString(),
    };
    const records = this.localStorageService.readMaintenanceRecordsSync();
    records.unshift(record);
    this.localStorageService.writeMaintenanceRecordsSync(records.slice(0, 1000));
    void this.auditService.tryCreate({
      entityType: 'system',
      entityId: record.maintenanceId,
      action: 'maintenance_recorded',
      before,
      after,
      message: `${operator.operatorName} 执行资料维护：${action}`,
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
      operatorRole: operator.operatorRole,
    });
    return record;
  }
}
