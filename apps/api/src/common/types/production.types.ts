import type {
  CheckItemStatus,
  ConfirmationStatus,
  AuditAction,
  AuditEntityType,
  DocumentSource,
  DocumentStatus,
  DocumentTypeV03,
  LegacyDocumentType,
  MaterialStatus,
  PlanStatus,
  PreviewType,
  ProcessSegment,
  ReadinessStatus,
  RequiredProcess,
  SearchResultType,
  SearchScope,
} from '../enums/production.enum';

export interface CustomerSeed {
  id: string;
  name: string;
  code: string;
  salesOwner: string;
}

export interface ProductSeed {
  id: string;
  customerId: string;
  productCode: string;
  productName: string;
  currentVersion: string;
  processSegment: ProcessSegment;
}

export interface ProductionPlanSeed {
  id: string;
  date: string;
  weekPlanNo: string;
  sales: string;
  productId: string;
  segment: ProcessSegment;
  plannedQuantity: number;
  completedQuantity: number;
  status: PlanStatus;
  owner: string;
  materialCompleteness: number;
  confirmationStatus: ConfirmationStatus;
  querySuggestions: string[];
}

export interface FrontProcessParameterSeed {
  id: string;
  productId: string;
  wireLength: string;
  strippingLength: string;
  terminalModel: string;
  pullForceStandard: string;
  crimpHeight: string;
  drawingVersion: string;
  parameterStatus: MaterialStatus;
}

export interface BackProcessPackageSeed {
  id: string;
  productId: string;
  connectorModel: string;
  assemblyManual: string;
  pinMap: string;
  sop: string;
  finishedImageCount: number;
  drawingVersion: string;
  sopVersion: string;
  materialStatus: MaterialStatus;
}

export interface ProductDocumentSeed {
  documentId: string;
  productId: string;
  planId?: string;
  documentType: DocumentTypeV03;
  title: string;
  version: string;
  status: DocumentStatus;
  effectiveDate: string;
  updatedAt: string;
  source: DocumentSource;
  requiredForProcess: RequiredProcess;
  previewType: PreviewType;
  mockPreviewText: string;
  keywords: string[];
}

export interface QueryLogSeed {
  id: string;
  planId: string;
  keyword: string;
  querySource: string;
  createdAt: string;
}

export interface ConfirmationRecordSeed {
  id: string;
  planId: string;
  userId: string;
  userName: string;
  role: '前段组长' | '后段组长';
  createdAt: string;
}

export interface FeedbackRecordMock {
  id: string;
  planId: string;
  type: string;
  description: string;
  createdAt: string;
  userId: string;
  userName: string;
}

export interface ProductDocument {
  id: string;
  documentId: string;
  productId: string;
  planId?: string;
  type: LegacyDocumentType;
  documentType: DocumentTypeV03;
  title: string;
  version: string;
  status: MaterialStatus;
  documentStatus: DocumentStatus;
  effectiveDate: string;
  updatedAt: string;
  source: DocumentSource;
  requiredForProcess: RequiredProcess;
  previewType: PreviewType;
  mockPreviewText: string;
  keywords: string[];
  description: string;
  localMockLabel: string;
  originalFileName?: string;
  storedFileName?: string;
  mimeType?: string;
  fileSize?: number;
  previewUrl?: string;
  downloadUrl?: string;
  storageProvider?: 'local' | 's3' | string;
  storageKey?: string;
  checksum?: string;
  createdAt?: string;
  archived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  remark?: string;
  versionGroupKey?: string;
}

export interface ReadinessCheckItem {
  key: string;
  label: string;
  required: boolean;
  status: CheckItemStatus;
  message: string;
}

export interface VersionAlert {
  level: 'warning' | 'danger';
  message: string;
}

export interface PlanReadiness {
  planId: string;
  readinessStatus: ReadinessStatus;
  score: number;
  summary: string;
  checkItems: ReadinessCheckItem[];
  versionAlerts: VersionAlert[];
}

export interface ProductionPlanMock {
  id: string;
  date: string;
  weekPlanNo: string;
  sales: string;
  customer: string;
  customerId: string;
  productId: string;
  productCode: string;
  productName: string;
  productVersion: string;
  segment: ProcessSegment;
  plannedQuantity: number;
  completedQuantity: number;
  status: PlanStatus;
  owner: string;
  materialCompleteness: number;
  confirmationStatus: ConfirmationStatus;
  versionStatus: {
    status: MaterialStatus;
    message: string;
    redLine: boolean;
  };
  querySuggestions: string[];
  front: Omit<FrontProcessParameterSeed, 'id' | 'productId'>;
  back: Omit<BackProcessPackageSeed, 'id' | 'productId'>;
  documents: ProductDocument[];
  readiness?: PlanReadiness;
}

export interface SearchResult {
  id: string;
  planId: string;
  type: SearchResultType;
  scope: SearchScope;
  title: string;
  subtitle: string;
  matchedField: string;
  snippet: string;
  version?: string;
  status?: DocumentStatus;
  source?: DocumentSource;
  isEffective?: boolean;
  isHistorical?: boolean;
  versionGroupKey?: string;
}

export interface DocumentQuery {
  planId?: string;
  productId?: string;
  documentType?: DocumentTypeV03;
  status?: DocumentStatus;
}

export interface CreateUploadedDocumentPayload {
  productId: string;
  planId?: string;
  documentType: DocumentTypeV03;
  title: string;
  version: string;
  status: DocumentStatus;
  requiredForProcess: RequiredProcess;
  keywords: string[];
  remark?: string;
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  fileSize: number;
  previewType: PreviewType;
  previewUrl?: string;
  downloadUrl?: string;
  storageProvider?: 'local' | 's3' | string;
  storageKey?: string;
  checksum?: string;
}

export interface UpdateDocumentStatusPayload {
  status: DocumentStatus;
  reason?: string;
}

export interface UpdateDocumentVersionPayload {
  version: string;
  status?: DocumentStatus;
}

export interface OperatorPayload {
  operatorId?: string;
  operatorName?: string;
  operatorRole?: string;
}

export interface SetEffectiveDocumentPayload extends OperatorPayload {
  reason?: string;
}

export interface DocumentVersionQuery {
  productId: string;
  documentType?: DocumentTypeV03;
  requiredForProcess?: RequiredProcess;
}

export interface DocumentVersionGroup {
  versionGroupKey: string;
  productId: string;
  documentType: DocumentTypeV03;
  requiredForProcess: RequiredProcess;
  currentDocument?: ProductDocument;
  versions: ProductDocument[];
  effectiveDocumentId?: string;
  versionCount: number;
  hasExpired: boolean;
  hasPendingReview: boolean;
  hasInconsistent: boolean;
}

export interface DocumentVersionsResponse extends DocumentVersionGroup {
  currentDocument: ProductDocument;
}

export interface DocumentCompareField {
  field: string;
  label: string;
  values: Array<string | number | string[] | undefined>;
  different: boolean;
}

export interface DocumentCompareResult {
  documents: ProductDocument[];
  fields: DocumentCompareField[];
}

export interface SetEffectiveDocumentResult {
  document: ProductDocument;
  versions: DocumentVersionsResponse;
  readiness?: PlanReadiness;
}

export interface AuditLog {
  auditId: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  before?: unknown;
  after?: unknown;
  message: string;
  operatorId: string;
  operatorName: string;
  operatorRole: string;
  planId?: string;
  productId?: string;
  createdAt: string;
}

export interface AuditLogQuery {
  entityType?: AuditEntityType;
  entityId?: string;
  planId?: string;
  productId?: string;
  action?: AuditAction;
  limit?: number;
}

export interface CreateAuditLogPayload {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  before?: unknown;
  after?: unknown;
  message: string;
  operatorId?: string;
  operatorName?: string;
  operatorRole?: string;
  planId?: string;
  productId?: string;
}

export interface MigrationPreview {
  dataSource: 'mock' | 'prisma';
  target: 'prisma_postgresql';
  safeToMigrate: boolean;
  summary: {
    customers: number;
    products: number;
    productionPlans: number;
    documents: number;
    uploadedDocuments: number;
    auditLogs: number;
    feedbackRecords: number;
    confirmationRecords: number;
  };
  warnings: string[];
}

export interface MigrationSeedExport {
  exportedAt: string;
  dataSource: 'mock';
  target: 'prisma_postgresql';
  customers: CustomerSeed[];
  products: ProductSeed[];
  productionPlans: ProductionPlanSeed[];
  documents: ProductDocument[];
  frontParameters: FrontProcessParameterSeed[];
  backPackages: BackProcessPackageSeed[];
  feedbackRecords: FeedbackRecordMock[];
  confirmationRecords: ConfirmationRecordSeed[];
  auditLogs: AuditLog[];
}
