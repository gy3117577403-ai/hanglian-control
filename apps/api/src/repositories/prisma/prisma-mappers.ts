import {
  documentStatusLabelMap,
  legacyDocumentTypeMap,
  type AuditAction,
  type AuditEntityType,
  type ConfirmationStatus,
  type DocumentSource,
  type DocumentStatus,
  type DocumentTypeV03,
  type MaterialStatus,
  type PlanStatus,
  type ProcessSegment,
  type RequiredProcess,
} from '../../common/enums/production.enum';
import { evaluatePlanReadiness } from '../../common/utils/readiness';
import type {
  AuditLog,
  BackProcessPackageSeed,
  FeedbackRecordMock,
  FrontProcessParameterSeed,
  ProductDocument,
  ProductionPlanMock,
} from '../../common/types/production.types';

type AnyRecord = Record<string, any>;

const PROCESS_FROM_PRISMA: Record<string, ProcessSegment> = {
  FRONT: '前段',
  BACK: '后段',
  COMMON: '通用',
};

const PROCESS_TO_PRISMA: Record<string, string> = {
  前段: 'FRONT',
  后段: 'BACK',
  通用: 'COMMON',
  front: 'FRONT',
  back: 'BACK',
  common: 'COMMON',
};

const PLAN_STATUS_FROM_PRISMA: Record<string, PlanStatus> = {
  PENDING: '待生产',
  IN_PROGRESS: '生产中',
  COMPLETED: '已完成',
  EXCEPTION: '异常',
};

const PLAN_STATUS_TO_PRISMA: Record<string, string> = {
  待生产: 'PENDING',
  生产中: 'IN_PROGRESS',
  已完成: 'COMPLETED',
  异常: 'EXCEPTION',
};

const CONFIRM_FROM_PRISMA: Record<string, ConfirmationStatus> = {
  UNCONFIRMED: '未确认',
  CONFIRMED: '已确认',
  NEED_REVIEW: '需复核',
};

const CONFIRM_TO_PRISMA: Record<string, string> = {
  未确认: 'UNCONFIRMED',
  已确认: 'CONFIRMED',
  需复核: 'NEED_REVIEW',
};

const DOCUMENT_TYPE_FROM_PRISMA: Record<string, DocumentTypeV03> = {
  DRAWING_PDF: 'drawing_pdf',
  SOP_IMAGE: 'sop_image',
  CONNECTOR_MANUAL: 'connector_manual',
  PINOUT_DIAGRAM: 'pinout_diagram',
  FINISHED_DETAIL_IMAGE: 'finished_detail_image',
  PROCESS_CARD: 'process_card',
};

const DOCUMENT_TYPE_TO_PRISMA: Record<DocumentTypeV03, string> = {
  drawing_pdf: 'DRAWING_PDF',
  sop_image: 'SOP_IMAGE',
  connector_manual: 'CONNECTOR_MANUAL',
  pinout_diagram: 'PINOUT_DIAGRAM',
  finished_detail_image: 'FINISHED_DETAIL_IMAGE',
  process_card: 'PROCESS_CARD',
};

const DOCUMENT_STATUS_FROM_PRISMA: Record<string, DocumentStatus> = {
  EFFECTIVE: 'effective',
  PENDING_REVIEW: 'pending_review',
  EXPIRED: 'expired',
  MISSING: 'missing',
  INCONSISTENT: 'inconsistent',
};

const DOCUMENT_STATUS_TO_PRISMA: Record<DocumentStatus, string> = {
  effective: 'EFFECTIVE',
  pending_review: 'PENDING_REVIEW',
  expired: 'EXPIRED',
  missing: 'MISSING',
  inconsistent: 'INCONSISTENT',
};

const DOCUMENT_SOURCE_FROM_PRISMA: Record<string, DocumentSource> = {
  MOCK: 'mock',
  WECOM_DISK: 'wecom_disk',
  MANUAL_UPLOAD: 'manual_upload',
  PDF_IMPORT: 'pdf_import',
  MANUAL_CREATE: 'manual_upload',
  FUTURE_WECOM: 'wecom_disk',
  SEED: 'mock',
};

const DOCUMENT_SOURCE_TO_PRISMA: Record<DocumentSource, string> = {
  mock: 'MOCK',
  wecom_disk: 'WECOM_DISK',
  manual_upload: 'MANUAL_UPLOAD',
  pdf_import: 'PDF_IMPORT',
  camera_capture: 'MANUAL_UPLOAD',
};

const FEEDBACK_TO_PRISMA: Record<string, string> = {
  资料缺失: 'MISSING_DOCUMENT',
  版本异常: 'VERSION_EXCEPTION',
  参数不一致: 'PARAMETER_MISMATCH',
  图纸不清晰: 'UNCLEAR_DRAWING',
  'SOP 与现场不符': 'SOP_SITE_MISMATCH',
  其他: 'OTHER',
};

const FEEDBACK_FROM_PRISMA: Record<string, string> = {
  MISSING_DOCUMENT: '资料缺失',
  VERSION_EXCEPTION: '版本异常',
  PARAMETER_MISMATCH: '参数不一致',
  UNCLEAR_DRAWING: '图纸不清晰',
  SOP_SITE_MISMATCH: 'SOP 与现场不符',
  OTHER: '其他',
};

const AUDIT_ENTITY_TO_PRISMA: Record<AuditEntityType, string> = {
  document: 'DOCUMENT',
  plan: 'PLAN',
  feedback: 'FEEDBACK',
  file: 'FILE',
  system: 'SYSTEM',
  import: 'IMPORT',
  knowledge: 'KNOWLEDGE',
  product: 'IMPORT',
};

const AUDIT_ENTITY_FROM_PRISMA: Record<string, AuditEntityType> = {
  DOCUMENT: 'document',
  PLAN: 'plan',
  FEEDBACK: 'feedback',
  FILE: 'file',
  SYSTEM: 'system',
  IMPORT: 'import',
  KNOWLEDGE: 'knowledge',
};

const AUDIT_ACTION_TO_PRISMA: Record<AuditAction, string> = {
  document_uploaded: 'DOCUMENT_UPLOADED',
  pdf_drawing_imported: 'DOCUMENT_UPLOADED',
  pdf_import_product_created: 'BUSINESS_DATA_IMPORTED',
  document_status_changed: 'DOCUMENT_STATUS_CHANGED',
  document_version_changed: 'DOCUMENT_VERSION_CHANGED',
  document_set_effective: 'DOCUMENT_SET_EFFECTIVE',
  document_archived: 'DOCUMENT_ARCHIVED',
  document_previewed: 'DOCUMENT_PREVIEWED',
  document_downloaded: 'DOCUMENT_DOWNLOADED',
  readiness_recalculated: 'READINESS_RECALCULATED',
  migration_preview_generated: 'MIGRATION_PREVIEW_GENERATED',
  business_data_imported: 'BUSINESS_DATA_IMPORTED',
  maintenance_recorded: 'MAINTENANCE_RECORDED',
};

const AUDIT_ACTION_FROM_PRISMA: Record<string, AuditAction> = {
  DOCUMENT_UPLOADED: 'document_uploaded',
  DOCUMENT_STATUS_CHANGED: 'document_status_changed',
  DOCUMENT_VERSION_CHANGED: 'document_version_changed',
  DOCUMENT_SET_EFFECTIVE: 'document_set_effective',
  DOCUMENT_ARCHIVED: 'document_archived',
  DOCUMENT_PREVIEWED: 'document_previewed',
  DOCUMENT_DOWNLOADED: 'document_downloaded',
  READINESS_RECALCULATED: 'readiness_recalculated',
  MIGRATION_PREVIEW_GENERATED: 'migration_preview_generated',
  BUSINESS_DATA_IMPORTED: 'business_data_imported',
  MAINTENANCE_RECORDED: 'maintenance_recorded',
};

export function prismaProcessToApi(value?: string): ProcessSegment {
  return PROCESS_FROM_PRISMA[value ?? 'COMMON'] ?? '通用';
}

export function apiProcessToPrisma(value?: ProcessSegment | RequiredProcess): string {
  return PROCESS_TO_PRISMA[value ?? 'common'] ?? 'COMMON';
}

export function prismaPlanStatusToApi(value?: string): PlanStatus {
  return PLAN_STATUS_FROM_PRISMA[value ?? 'PENDING'] ?? '待生产';
}

export function prismaConfirmStatusToApi(value?: string): ConfirmationStatus {
  return CONFIRM_FROM_PRISMA[value ?? 'UNCONFIRMED'] ?? '未确认';
}

export function apiConfirmStatusToPrisma(value?: ConfirmationStatus): string {
  return CONFIRM_TO_PRISMA[value ?? '未确认'] ?? 'UNCONFIRMED';
}

export function prismaDocumentTypeToApi(value?: string): DocumentTypeV03 {
  return DOCUMENT_TYPE_FROM_PRISMA[value ?? 'PROCESS_CARD'] ?? 'process_card';
}

export function apiDocumentTypeToPrisma(value: DocumentTypeV03): string {
  return DOCUMENT_TYPE_TO_PRISMA[value];
}

export function prismaDocumentStatusToApi(value?: string): DocumentStatus {
  return DOCUMENT_STATUS_FROM_PRISMA[value ?? 'PENDING_REVIEW'] ?? 'pending_review';
}

export function apiDocumentStatusToPrisma(value: DocumentStatus): string {
  return DOCUMENT_STATUS_TO_PRISMA[value];
}

export function prismaDocumentSourceToApi(value?: string): DocumentSource {
  return DOCUMENT_SOURCE_FROM_PRISMA[value ?? 'MOCK'] ?? 'mock';
}

export function apiDocumentSourceToPrisma(value?: DocumentSource): string {
  return DOCUMENT_SOURCE_TO_PRISMA[value ?? 'mock'];
}

export function apiFeedbackTypeToPrisma(value: string): string {
  return FEEDBACK_TO_PRISMA[value] ?? 'OTHER';
}

export function prismaFeedbackTypeToApi(value?: string): string {
  return FEEDBACK_FROM_PRISMA[value ?? 'OTHER'] ?? '其他';
}

export function apiAuditEntityToPrisma(value: AuditEntityType): string {
  return AUDIT_ENTITY_TO_PRISMA[value];
}

export function prismaAuditEntityToApi(value?: string): AuditEntityType {
  return AUDIT_ENTITY_FROM_PRISMA[value ?? 'SYSTEM'] ?? 'system';
}

export function apiAuditActionToPrisma(value: AuditAction): string {
  return AUDIT_ACTION_TO_PRISMA[value];
}

export function prismaAuditActionToApi(value?: string): AuditAction {
  return AUDIT_ACTION_FROM_PRISMA[value ?? 'MIGRATION_PREVIEW_GENERATED'] ?? 'migration_preview_generated';
}

export function documentVersionGroupKey(document: Pick<ProductDocument, 'productId' | 'documentType' | 'requiredForProcess'>) {
  return `${document.productId}::${document.documentType}::${document.requiredForProcess}`;
}

export function labelForDocument(documentType: DocumentTypeV03) {
  switch (documentType) {
    case 'drawing_pdf':
      return 'PDF 图纸';
    case 'sop_image':
      return 'SOP 扫描图片';
    case 'connector_manual':
      return '连接器装配说明书';
    case 'pinout_diagram':
      return '插接孔位图';
    case 'finished_detail_image':
      return '成品细节图';
    case 'process_card':
      return '作业流程卡';
  }
}

function dateOnly(value?: string | Date | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function dateTime(value?: string | Date | null) {
  return value ? new Date(value).toISOString() : new Date().toISOString();
}

export function mapPrismaDocument(row: AnyRecord): ProductDocument {
  const documentType = prismaDocumentTypeToApi(row.documentType);
  const documentStatus = prismaDocumentStatusToApi(row.status);
  const productId = row.productId ?? '';
  const requiredForProcess = (row.requiredForProcess
    ? PROCESS_FROM_PRISMA[row.requiredForProcess]
    : undefined) === '前段'
    ? 'front'
    : (row.requiredForProcess ? PROCESS_FROM_PRISMA[row.requiredForProcess] : undefined) === '后段'
      ? 'back'
      : 'common';

  const document = {
    id: row.id,
    documentId: row.id,
    productId,
    moduleKey: row.moduleKey ?? undefined,
    planId: row.productionPlanId ?? undefined,
    type: legacyDocumentTypeMap[documentType],
    documentType,
    title: row.title ?? labelForDocument(documentType),
    version: row.version ?? 'V0',
    status: documentStatusLabelMap[documentStatus] as MaterialStatus,
    documentStatus,
    effectiveDate: dateOnly(row.effectiveDate ?? row.createdAt),
    updatedAt: dateTime(row.updatedAt),
    source: prismaDocumentSourceToApi(row.source),
    requiredForProcess,
    previewType: row.previewType ?? (documentType === 'drawing_pdf' ? 'pdf' : 'image'),
    mockPreviewText: row.mockPreviewText ?? row.remark ?? 'Prisma 资料预览占位',
    keywords: row.keywords ?? [],
    description: row.remark ?? row.mockPreviewText ?? row.title ?? labelForDocument(documentType),
    localMockLabel: labelForDocument(documentType),
    originalFileName: row.originalFileName ?? undefined,
    storedFileName: row.storedFileName ?? undefined,
    storageProvider: row.storageProvider === 's3' ? 's3' : row.storageProvider === 'local' ? 'local' : undefined,
    storageKey: row.storageKey ?? undefined,
    checksumSha256: row.checksum ?? undefined,
    previewMode: row.storageProvider === 's3' ? 'signed-url' : row.storageProvider === 'local' ? 'proxy' : undefined,
    mimeType: row.mimeType ?? undefined,
    fileSize: row.fileSize ?? undefined,
    previewUrl: row.previewUrl ?? undefined,
    downloadUrl: row.downloadUrl ?? undefined,
    storageProvider: row.storageProvider ?? undefined,
    storageKey: row.storageKey ?? undefined,
    checksum: row.checksum ?? undefined,
    createdAt: dateTime(row.createdAt),
    archived: row.archived ?? false,
    archivedAt: row.archivedAt ? dateTime(row.archivedAt) : undefined,
    archivedBy: row.archivedBy ?? undefined,
    remark: row.remark ?? undefined,
    versionGroupKey: row.versionGroupKey ?? documentVersionGroupKey({ productId, documentType, requiredForProcess }),
  } as ProductDocument & { moduleKey?: string };
  return document;
}

function mapFront(row?: AnyRecord): FrontProcessParameterSeed {
  return {
    id: row?.id ?? '',
    productId: row?.productId ?? '',
    wireLength: row?.wireLength ?? '',
    strippingLength: row?.strippingLength ?? '',
    terminalModel: row?.terminalModel ?? '',
    pullForceStandard: row?.pullForceStandard ?? '',
    crimpHeight: row?.crimpHeight ?? '',
    drawingVersion: row?.drawingVersion ?? '',
    parameterStatus: documentStatusLabelMap[prismaDocumentStatusToApi(row?.status)] as MaterialStatus,
  };
}

function mapBack(row?: AnyRecord): BackProcessPackageSeed {
  return {
    id: row?.id ?? '',
    productId: row?.productId ?? '',
    connectorModel: row?.connectorModel ?? '',
    assemblyManual: row?.assemblyManual ?? '',
    pinMap: row?.pinMap ?? '',
    sop: row?.sop ?? '',
    finishedImageCount: row?.imageCount ?? 0,
    drawingVersion: row?.drawingVersion ?? '',
    sopVersion: row?.sopVersion ?? '',
    materialStatus: documentStatusLabelMap[prismaDocumentStatusToApi(row?.status)] as MaterialStatus,
  };
}

export function mapPrismaPlan(row: AnyRecord): ProductionPlanMock {
  const product = row.product ?? {};
  const customer = product.customer ?? {};
  const productDocuments = [...(row.documents ?? []), ...(product.documents ?? [])];
  const seenDocuments = new Set<string>();
  const documents = productDocuments
    .filter((document: AnyRecord) => {
      if (seenDocuments.has(document.id)) return false;
      seenDocuments.add(document.id);
      return !document.deletedAt;
    })
    .map(mapPrismaDocument);
  const front = mapFront(product.frontParameters?.[0]);
  const back = mapBack(product.backPackages?.[0]);
  const versionOk = front.parameterStatus === '有效' && back.materialStatus === '有效';

  const plan: ProductionPlanMock = {
    id: row.id,
    date: dateOnly(row.planDate),
    weekPlanNo: row.weekPlanCode ?? '',
    sales: row.sales ?? customer.salesOwner ?? '',
    customer: customer.name ?? '',
    customerId: customer.id ?? product.customerId ?? '',
    productId: product.id ?? row.productId ?? '',
    productCode: product.productCode ?? '',
    productName: product.productName ?? '',
    productVersion: product.currentVersion ?? '',
    segment: prismaProcessToApi(row.processSegment),
    plannedQuantity: row.plannedQuantity ?? 0,
    completedQuantity: row.completedQuantity ?? 0,
    status: prismaPlanStatusToApi(row.status),
    owner: row.owner ?? '',
    materialCompleteness: row.materialCompleteness ?? 0,
    confirmationStatus: prismaConfirmStatusToApi(row.confirmStatus),
    versionStatus: {
      status: versionOk ? '有效' : '待确认',
      message: versionOk ? '资料版本有效，可进入组长确认。' : '存在待确认或异常资料，请复核。',
      redLine: !versionOk,
    },
    querySuggestions: [
      back.pinMap,
      back.sop,
      back.connectorModel,
      front.terminalModel,
    ].filter(Boolean),
    front,
    back,
    documents,
  };

  return {
    ...plan,
    readiness: evaluatePlanReadiness(plan),
  };
}

export function mapPrismaFeedback(row: AnyRecord): FeedbackRecordMock {
  return {
    id: row.id,
    planId: row.productionPlanId,
    type: prismaFeedbackTypeToApi(row.feedbackType),
    description: row.description,
    createdAt: dateTime(row.createdAt),
    userId: row.userId ?? 'demo-leader',
    userName: row.user?.displayName ?? '组长演示账号',
  };
}

export function mapPrismaAuditLog(row: AnyRecord): AuditLog {
  return {
    auditId: row.id,
    entityType: prismaAuditEntityToApi(row.entityType),
    entityId: row.entityId,
    action: prismaAuditActionToApi(row.action),
    before: row.beforeJson ?? undefined,
    after: row.afterJson ?? undefined,
    message: row.message,
    operatorId: row.operatorId ?? 'system',
    operatorName: row.operatorName ?? '系统',
    operatorRole: row.operatorRole ?? 'system',
    planId: row.planId ?? undefined,
    productId: row.productId ?? undefined,
    orderId: row.orderId ?? undefined,
    createdAt: dateTime(row.createdAt),
  };
}

export const prismaWriteMaps = {
  planStatus: PLAN_STATUS_TO_PRISMA,
  confirmStatus: CONFIRM_TO_PRISMA,
  documentStatus: DOCUMENT_STATUS_TO_PRISMA,
  documentType: DOCUMENT_TYPE_TO_PRISMA,
  documentSource: DOCUMENT_SOURCE_TO_PRISMA,
  process: PROCESS_TO_PRISMA,
};
