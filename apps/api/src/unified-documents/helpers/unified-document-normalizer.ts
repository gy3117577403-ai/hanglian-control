import type { ProductDocument } from '../../common/types/production.types';
import type { AbnormalCaseKnowledge, FixtureKnowledge, QualityStandardKnowledge } from '../../knowledge/knowledge.types';

export type UnifiedItemKind =
  | 'document'
  | 'front_parameter'
  | 'back_package'
  | 'fixture'
  | 'abnormal_case'
  | 'quality_standard';

export interface UnifiedDocumentItem {
  id: string;
  type: UnifiedItemKind;
  unifiedType: string;
  title: string;
  subtitle: string;
  customerName?: string;
  productCode?: string;
  productName?: string;
  productVersion?: string;
  version?: string;
  status?: string;
  source?: string;
  matchedFields: string[];
  previewAvailable: boolean;
  deleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  restoredAt?: string;
  restoredBy?: string;
  updatedAt?: string;
  keywords?: string[];
  remark?: string;
  previewUrl?: string;
  downloadUrl?: string;
  originalFileName?: string;
  fileSize?: number;
  mimeType?: string;
  requiredForProcess?: string;
  document?: ProductDocument;
  raw?: unknown;
}

export function documentId(document: Pick<ProductDocument, 'documentId' | 'id'>) {
  return document.documentId || document.id;
}

export function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    effective: '有效',
    pending_review: '待确认',
    expired: '失效',
    missing: '缺失',
    inconsistent: '不一致',
    active: '启用',
    inactive: '停用',
    abnormal: '异常',
    closed: '已关闭',
  };
  return status ? labels[status] ?? status : '待确认';
}

export function unifiedTypeFromDocument(type?: ProductDocument['documentType']) {
  switch (type) {
    case 'drawing_pdf':
      return 'drawing';
    case 'sop_image':
    case 'process_card':
      return 'sop';
    case 'pinout_diagram':
      return 'pin_map';
    case 'finished_detail_image':
      return 'finished_image';
    case 'connector_manual':
      return 'connector';
    default:
      return 'other';
  }
}

export function documentTypeLabel(type?: string) {
  const labels: Record<string, string> = {
    drawing: '图纸',
    sop: 'SOP / 流程卡',
    pin_map: '孔位图',
    finished_image: '成品图',
    connector: '连接器',
    front_parameter: '前段参数',
    back_package: '后段资料',
    fixture: '治具',
    abnormal_case: '异常',
    quality_standard: '质量标准',
    other: '其他资料',
  };
  return labels[type ?? 'other'] ?? '其他资料';
}

export function normalizeDocument(document: ProductDocument & Record<string, unknown>): UnifiedDocumentItem {
  const unifiedType = String(document.unifiedType ?? unifiedTypeFromDocument(document.documentType));
  const status = document.documentStatus ?? document.status;
  const customerName = String(document.customerName ?? document.customer ?? '').trim() || undefined;
  const productCode = String(document.productCode ?? document.productId ?? '').trim() || undefined;
  const productName = String(document.productName ?? '').trim() || undefined;
  const subtitle = [
    customerName,
    productCode,
    documentTypeLabel(unifiedType),
    document.version,
    statusLabel(String(status ?? '')),
  ].filter(Boolean).join(' / ');

  return {
    id: documentId(document),
    type: 'document',
    unifiedType,
    title: document.title,
    subtitle,
    customerName,
    productCode,
    productName,
    productVersion: String(document.productVersion ?? '').trim() || undefined,
    version: document.version,
    status: statusLabel(String(status ?? '')),
    source: document.source,
    matchedFields: [],
    previewAvailable: Boolean(document.previewUrl && ['pdf', 'image'].includes(document.previewType ?? '')),
    deleted: Boolean(document.deleted),
    deletedAt: String(document.deletedAt ?? '').trim() || undefined,
    deletedBy: String(document.deletedBy ?? '').trim() || undefined,
    restoredAt: String(document.restoredAt ?? '').trim() || undefined,
    restoredBy: String(document.restoredBy ?? '').trim() || undefined,
    updatedAt: document.updatedAt,
    keywords: document.keywords,
    remark: document.remark,
    previewUrl: document.previewUrl,
    downloadUrl: document.downloadUrl,
    originalFileName: document.originalFileName,
    fileSize: document.fileSize,
    mimeType: document.mimeType,
    requiredForProcess: document.requiredForProcess,
    document,
    raw: document,
  };
}

export function normalizeFixture(item: FixtureKnowledge): UnifiedDocumentItem {
  return {
    id: item.fixtureId,
    type: 'fixture',
    unifiedType: 'fixture',
    title: item.fixtureName,
    subtitle: `${item.fixtureCode} / ${item.productCode} / ${statusLabel(item.status)}`,
    customerName: item.customerName,
    productCode: item.productCode,
    productName: item.productName,
    status: statusLabel(item.status),
    source: 'knowledge',
    matchedFields: [],
    previewAvailable: false,
    deleted: false,
    updatedAt: item.updatedAt,
    keywords: item.keywords,
    remark: item.remark,
    raw: item,
  };
}

export function normalizeAbnormalCase(item: AbnormalCaseKnowledge): UnifiedDocumentItem {
  return {
    id: item.abnormalId,
    type: 'abnormal_case',
    unifiedType: 'abnormal_case',
    title: item.title,
    subtitle: `${item.abnormalCode} / ${item.productCode} / ${statusLabel(item.status)}`,
    customerName: item.customerName,
    productCode: item.productCode,
    productName: item.productName,
    status: statusLabel(item.status),
    source: 'knowledge',
    matchedFields: [],
    previewAvailable: false,
    deleted: false,
    updatedAt: item.updatedAt,
    keywords: item.keywords,
    remark: item.remark,
    raw: item,
  };
}

export function normalizeQualityStandard(item: QualityStandardKnowledge): UnifiedDocumentItem {
  return {
    id: item.qualityId,
    type: 'quality_standard',
    unifiedType: 'quality_standard',
    title: item.title,
    subtitle: `${item.qualityCode} / ${item.inspectionItem} / ${statusLabel(item.status)}`,
    customerName: item.customerName,
    productCode: item.productCode,
    productName: item.productName,
    status: statusLabel(item.status),
    source: 'knowledge',
    matchedFields: [],
    previewAvailable: false,
    deleted: false,
    updatedAt: item.updatedAt,
    keywords: item.keywords,
    remark: item.remark,
    raw: item,
  };
}

export function matchKeyword(item: UnifiedDocumentItem, keyword?: string) {
  const normalized = String(keyword ?? '').trim().toLowerCase();
  if (!normalized) return { matched: true, fields: [] };
  const fields: Array<[string, unknown]> = [
    ['标题', item.title],
    ['副标题', item.subtitle],
    ['客户', item.customerName],
    ['产品编号', item.productCode],
    ['产品名称', item.productName],
    ['产品版本', item.productVersion],
    ['资料版本', item.version],
    ['状态', item.status],
    ['文件名', item.originalFileName],
    ['关键词', item.keywords?.join(',')],
    ['备注', item.remark],
    ['来源', item.source],
    ['原始数据', JSON.stringify(item.raw ?? {})],
  ];
  const matchedFields = fields
    .filter(([, value]) => String(value ?? '').toLowerCase().includes(normalized))
    .map(([field]) => field);
  return { matched: matchedFields.length > 0, fields: matchedFields };
}
