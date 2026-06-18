import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  backProcessPackages,
  confirmationRecords,
  customers,
  feedbackRecords,
  frontProcessParameters,
  materialStatusFromDocumentStatus,
  productDocuments,
  productionPlans,
  products,
  queryLogs,
} from './seed-v0.3';
import {
  documentStatusLabelMap,
  legacyDocumentTypeMap,
} from '../common/enums/production.enum';
import { shouldLoadDemoBusinessData } from '../config/mock-data-mode';
import type {
  BackProcessPackageSeed,
  CustomerSeed,
  FeedbackRecordMock,
  FrontProcessParameterSeed,
  ImportedBusinessDataSnapshot,
  ProductDocument,
  ProductDocumentSeed,
  ProductSeed,
  ProductionPlanMock,
  ProductionPlanSeed,
} from '../common/types/production.types';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function importedBusinessDataPath() {
  const metadataRoot = process.env.METADATA_ROOT?.trim();
  if (metadataRoot) {
    const configured = resolve(process.cwd(), metadataRoot, 'imported-business-data.json');
    if (existsSync(configured)) return configured;
  }
  const storageRoot = process.env.STORAGE_ROOT?.trim();
  if (storageRoot) {
    const configured = resolve(process.cwd(), storageRoot, 'metadata', 'imported-business-data.json');
    if (existsSync(configured)) return configured;
  }
  const cwdStorage = resolve(process.cwd(), 'storage', 'metadata', 'imported-business-data.json');
  if (existsSync(cwdStorage)) return cwdStorage;
  return resolve(process.cwd(), 'apps', 'api', 'storage', 'metadata', 'imported-business-data.json');
}

function readImportedBusinessData(): ImportedBusinessDataSnapshot | undefined {
  const file = importedBusinessDataPath();
  if (!existsSync(file)) return undefined;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as ImportedBusinessDataSnapshot;
  } catch {
    return undefined;
  }
}

function upsertById<T extends { id: string }>(target: T[], rows: T[]) {
  for (const row of rows) {
    const index = target.findIndex((item) => item.id === row.id);
    if (index >= 0) {
      target[index] = clone(row);
    } else {
      target.push(clone(row));
    }
  }
}

function labelForDocumentType(documentType: ProductDocumentSeed['documentType']) {
  switch (documentType) {
    case 'drawing_pdf':
      return '本地 Mock PDF 图纸占位';
    case 'sop_image':
      return '本地 Mock SOP 扫描图';
    case 'connector_manual':
      return '本地 Mock 连接器说明书';
    case 'pinout_diagram':
      return '本地 Mock 孔位图';
    case 'finished_detail_image':
      return '本地 Mock 成品细节图';
    case 'process_card':
      return '本地 Mock 作业流程卡';
  }
}

function toLegacyDocument(doc: ProductDocumentSeed): ProductDocument {
  return {
    id: doc.documentId,
    documentId: doc.documentId,
    productId: doc.productId,
    planId: doc.planId,
    type: legacyDocumentTypeMap[doc.documentType],
    documentType: doc.documentType,
    title: doc.title,
    version: doc.version,
    status: documentStatusLabelMap[doc.status],
    documentStatus: doc.status,
    effectiveDate: doc.effectiveDate,
    updatedAt: doc.updatedAt,
    source: doc.source,
    requiredForProcess: doc.requiredForProcess,
    previewType: doc.previewType,
    mockPreviewText: doc.mockPreviewText,
    keywords: doc.keywords,
    description: doc.mockPreviewText,
    localMockLabel: labelForDocumentType(doc.documentType),
  };
}

function versionStatusFor(
  plan: ProductionPlanSeed,
  front: FrontProcessParameterSeed,
  back: BackProcessPackageSeed,
  documents: ProductDocument[],
): ProductionPlanMock['versionStatus'] {
  const hasDanger = documents.some((doc) => ['expired', 'missing', 'inconsistent'].includes(doc.documentStatus))
    || front.parameterStatus === '失效'
    || back.materialStatus === '失效';
  const hasWarning = documents.some((doc) => doc.documentStatus === 'pending_review')
    || front.parameterStatus === '待确认'
    || back.materialStatus === '待确认'
    || plan.confirmationStatus === '需复核';

  if (hasDanger) {
    return { status: '失效', message: '存在已失效、缺失或不一致资料，需复核后开工。', redLine: true };
  }

  if (hasWarning) {
    return { status: '待确认', message: '存在待确认资料，需组长复核。', redLine: true };
  }

  return { status: '有效', message: '资料版本有效，可进入组长确认。', redLine: false };
}

function toProductionPlanMock(
  plan: ProductionPlanSeed,
  product: ProductSeed,
  customer: CustomerSeed,
  front: FrontProcessParameterSeed,
  back: BackProcessPackageSeed,
  docs: ProductDocumentSeed[],
): ProductionPlanMock {
  const documents = docs.map(toLegacyDocument);

  return {
    id: plan.id,
    date: plan.date,
    weekPlanNo: plan.weekPlanNo,
    sales: plan.sales,
    customer: customer.name,
    customerId: customer.id,
    productId: product.id,
    productCode: product.productCode,
    productName: product.productName,
    productVersion: product.currentVersion,
    segment: plan.segment,
    plannedQuantity: plan.plannedQuantity,
    completedQuantity: plan.completedQuantity,
    status: plan.status,
    owner: plan.owner,
    materialCompleteness: plan.materialCompleteness,
    confirmationStatus: plan.confirmationStatus,
    versionStatus: versionStatusFor(plan, front, back, documents),
    querySuggestions: plan.querySuggestions,
    front: {
      wireLength: front.wireLength,
      strippingLength: front.strippingLength,
      terminalModel: front.terminalModel,
      pullForceStandard: front.pullForceStandard,
      crimpHeight: front.crimpHeight,
      drawingVersion: front.drawingVersion,
      parameterStatus: front.parameterStatus,
    },
    back: {
      connectorModel: back.connectorModel,
      assemblyManual: back.assemblyManual,
      pinMap: back.pinMap,
      sop: back.sop,
      finishedImageCount: back.finishedImageCount,
      drawingVersion: back.drawingVersion,
      sopVersion: back.sopVersion,
      materialStatus: back.materialStatus,
    },
    documents,
  };
}

function buildProductionPlans(): ProductionPlanMock[] {
  if (!shouldLoadDemoBusinessData()) return [];

  return productionPlans.map((plan) => {
    const product = products.find((item) => item.id === plan.productId);
    if (!product) throw new Error(`Mock seed missing product: ${plan.productId}`);

    const customer = customers.find((item) => item.id === product.customerId);
    const front = frontProcessParameters.find((item) => item.productId === product.id);
    const back = backProcessPackages.find((item) => item.productId === product.id);

    if (!customer || !front || !back) {
      throw new Error(`Mock seed incomplete for product: ${product.id}`);
    }

    return toProductionPlanMock(
      plan,
      product,
      customer,
      front,
      back,
      productDocuments.filter((doc) => doc.productId === product.id),
    );
  });
}

export class MockStore {
  readonly customers = shouldLoadDemoBusinessData() ? clone(customers) : [];
  readonly products = shouldLoadDemoBusinessData() ? clone(products) : [];
  readonly queryLogs = shouldLoadDemoBusinessData() ? clone(queryLogs) : [];
  readonly confirmationRecords = shouldLoadDemoBusinessData() ? clone(confirmationRecords) : [];
  readonly productionPlans = buildProductionPlans();
  readonly feedbackRecords: FeedbackRecordMock[] = shouldLoadDemoBusinessData() ? clone(feedbackRecords) : [];

  constructor() {
    this.mergeImportedBusinessData(readImportedBusinessData());
  }

  findPlanById(planId: string) {
    return this.productionPlans.find((plan) => plan.id === planId);
  }

  findPlanByProductCode(productCode: string) {
    return this.productionPlans.find((plan) => plan.productCode === productCode);
  }

  findPlansByScope(scope: 'today' | 'week' = 'today') {
    if (scope === 'week') return this.productionPlans;
    return this.productionPlans.filter((plan) => plan.date === '2026-06-11');
  }

  updatePlan(planId: string, patch: Partial<ProductionPlanMock>) {
    const plan = this.findPlanById(planId);
    if (!plan) return undefined;
    Object.assign(plan, patch);
    return plan;
  }

  addFeedback(record: FeedbackRecordMock) {
    this.feedbackRecords.unshift(record);
    return record;
  }

  mergeImportedBusinessData(snapshot?: ImportedBusinessDataSnapshot) {
    if (!snapshot) return;
    upsertById(this.customers, snapshot.customers ?? []);
    upsertById(this.products, snapshot.products ?? []);
    upsertById(this.productionPlans, snapshot.productionPlans ?? []);
    for (const front of snapshot.frontParameters ?? []) {
      for (const plan of this.productionPlans.filter((item) => item.productId === front.productId)) {
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
    }
    for (const back of snapshot.backPackages ?? []) {
      for (const plan of this.productionPlans.filter((item) => item.productId === back.productId)) {
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
    }
  }

  importedSnapshotBase(): ImportedBusinessDataSnapshot {
    return readImportedBusinessData() ?? {
      updatedAt: new Date(0).toISOString(),
      customers: [],
      products: [],
      productionPlans: [],
      frontParameters: [],
      backPackages: [],
    };
  }
}

export const mockStore = new MockStore();

export const productionPlansMock = mockStore.productionPlans;
export const feedbackRecordsMock = mockStore.feedbackRecords;
export type { FeedbackRecordMock, ProductDocument, ProductionPlanMock } from '../common/types/production.types';
export type {
  ConfirmationStatus,
  DocumentStatus,
  DocumentTypeV03,
  LegacyDocumentType as DocumentType,
  MaterialStatus,
  PlanStatus,
  ProcessSegment,
  SearchResultType,
} from '../common/enums/production.enum';
