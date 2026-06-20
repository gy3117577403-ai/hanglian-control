import { BadRequestException, ConflictException } from '@nestjs/common';
import { documentStatusLabelMap, type DocumentTypeV03, type RequiredProcess } from '../../common/enums/production.enum';
import type { ProductDocument } from '../../common/types/production.types';
import type {
  DrawingItem,
  DrawingModule,
  DrawingModuleKey,
  DrawingStatus,
  ProductDrawingDetail,
} from '../mock/document-hub.seed';

export type LifecycleDocument = ProductDocument & {
  deleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deleteReason?: string | null;
  restoredAt?: string | null;
  restoredBy?: string | null;
  restoreRemark?: string | null;
  purgedAt?: string | null;
};

export const lifecycleModuleKeys: DrawingModuleKey[] = [
  'original_drawing',
  'sop',
  'finished_images',
  'accessory_specs',
  'notes',
  'tooling',
];

const moduleLabels: Record<DrawingModuleKey, string> = {
  original_drawing: '\u539f\u56fe',
  sop: 'SOP \u6307\u5bfc\u4e66',
  finished_images: '\u6210\u54c1\u56fe',
  accessory_specs: '\u8f85\u6599\u89c4\u683c',
  notes: '\u6ce8\u610f\u4e8b\u9879',
  tooling: '\u914d\u5957\u5de5\u88c5',
};

export function assertLifecycleModuleKey(value: string): DrawingModuleKey {
  if (lifecycleModuleKeys.includes(value as DrawingModuleKey)) return value as DrawingModuleKey;
  throw new BadRequestException('\u8d44\u6599\u6a21\u5757\u4e0d\u5408\u6cd5\u3002');
}

export function documentId(document: Pick<ProductDocument, 'documentId' | 'id'>) {
  return document.documentId ?? document.id;
}

export function cleanLifecycleText(value: unknown, maxLength = 120) {
  return (typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/g, ' ') : '').slice(0, maxLength);
}

export function moduleNameForKey(moduleKey: DrawingModuleKey) {
  return moduleLabels[moduleKey];
}

export function documentTypeForModule(moduleKey: DrawingModuleKey): DocumentTypeV03 {
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

export function moduleForDocumentType(documentType: DocumentTypeV03): DrawingModuleKey {
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

export function requiredProcessForModule(moduleKey: DrawingModuleKey): RequiredProcess {
  return moduleKey === 'sop' || moduleKey === 'finished_images' ? 'back' : 'common';
}

export function isFormalLifecycleDocument(document?: ProductDocument): document is LifecycleDocument {
  return Boolean(document && (
    document.source === 'manual_upload'
    || document.source === 'camera_capture'
    || document.source === 'pdf_import'
  ));
}

export function isDocumentDeleted(document: ProductDocument) {
  const item = document as LifecycleDocument;
  return item.deleted === true || Boolean(item.deletedAt);
}

export function assertFormalLifecycleDocument(document?: ProductDocument): asserts document is LifecycleDocument {
  if (!isFormalLifecycleDocument(document)) {
    throw new ConflictException('\u8be5\u8d44\u6599\u4e3a\u7cfb\u7edf\u5360\u4f4d\u8d44\u6599\uff0c\u6682\u4e0d\u652f\u6301\u5220\u9664\u3002');
  }
}

export function assertDocumentBelongsToModule(document: ProductDocument, productId: string, moduleKey: DrawingModuleKey) {
  if (document.productId !== productId || moduleForDocumentType(document.documentType) !== moduleKey) {
    throw new BadRequestException('\u8d44\u6599\u5f52\u5c5e\u4e0e\u5f53\u524d\u4ea7\u54c1\u6216\u6a21\u5757\u4e0d\u5339\u914d\u3002');
  }
}

export function assertSafeLifecycleStorageKey(key?: string) {
  if (!key) return undefined;
  const normalized = key.replace(/\\/g, '/').replace(/^\/+/, '');
  if (
    !normalized
    || normalized.includes('..')
    || normalized.endsWith('/')
    || normalized.split('/').some((part) => !part || part === '.' || part === '..')
  ) {
    throw new BadRequestException('\u5b58\u50a8 key \u4e0d\u5b89\u5168\uff0c\u5df2\u62d2\u7edd\u5220\u9664\u3002');
  }
  if (!/^[a-zA-Z0-9._/-]+$/.test(normalized)) {
    throw new BadRequestException('\u5b58\u50a8 key \u5305\u542b\u4e0d\u652f\u6301\u7684\u5b57\u7b26\u3002');
  }
  return normalized;
}

function fileTypeForDocument(document: ProductDocument): DrawingItem['fileType'] {
  if (document.previewType === 'pdf' || document.mimeType === 'application/pdf') return 'pdf';
  if (document.previewType === 'image' || document.mimeType?.startsWith('image/')) return 'image';
  return 'card';
}

function drawingItemStatus(document: ProductDocument): DrawingItem['documentStatus'] {
  if (document.documentStatus === 'effective') return 'effective';
  if (document.documentStatus === 'expired') return 'expired';
  return 'pending';
}

export function documentToLifecycleItem(document: ProductDocument, overrides: Partial<DrawingItem> = {}): DrawingItem {
  const id = documentId(document);
  return {
    itemId: id,
    title: document.title,
    fileType: fileTypeForDocument(document),
    previewUrl: document.previewUrl,
    fileName: document.originalFileName ?? document.title,
    version: document.version,
    remark: document.remark ?? document.description ?? document.mockPreviewText,
    uploadedAt: document.updatedAt ?? document.createdAt ?? new Date().toISOString(),
    source: document.source === 'pdf_import'
      ? 'pdf_import'
      : document.source === 'camera_capture'
        ? 'camera_capture'
        : 'manual_upload',
    storageProvider: document.storageProvider,
    storageKey: document.storageKey,
    checksumSha256: document.checksumSha256,
    fileSize: document.fileSize,
    mimeType: document.mimeType,
    documentStatus: drawingItemStatus(document),
    ...overrides,
  };
}

export function versionGroupKey(document: Pick<ProductDocument, 'productId' | 'documentType' | 'requiredForProcess' | 'versionGroupKey'>) {
  return document.versionGroupKey ?? `${document.productId}::${document.documentType}::${document.requiredForProcess}`;
}

export function downgradeRestoredEffectiveIfNeeded(document: LifecycleDocument, documents: ProductDocument[]) {
  if (document.documentStatus !== 'effective') {
    return { document, warning: undefined as string | undefined };
  }
  const currentId = documentId(document);
  const key = versionGroupKey(document);
  const hasOtherEffective = documents.some((item) => (
    documentId(item) !== currentId
    && !isDocumentDeleted(item)
    && versionGroupKey(item) === key
    && item.documentStatus === 'effective'
  ));
  if (!hasOtherEffective) return { document, warning: undefined as string | undefined };
  return {
    document: {
      ...document,
      documentStatus: 'pending_review' as const,
      status: documentStatusLabelMap.pending_review,
    },
    warning: '\u5df2\u5b58\u5728\u5176\u4ed6\u5f53\u524d\u6709\u6548\u7248\u672c\uff0c\u8be5\u8d44\u6599\u5df2\u6062\u590d\u4e3a\u5f85\u786e\u8ba4\u7248\u672c\u3002',
  };
}

function timestampValue(value?: string) {
  const time = value ? Date.parse(value) : 0;
  return Number.isFinite(time) ? time : 0;
}

function compareLatest(left: DrawingItem, right: DrawingItem) {
  const statusDiff = (left.documentStatus === 'effective' ? 0 : 1) - (right.documentStatus === 'effective' ? 0 : 1);
  if (statusDiff) return statusDiff;
  return timestampValue(right.uploadedAt) - timestampValue(left.uploadedAt);
}

function chooseCoverItem(items: DrawingItem[]) {
  return [...items].sort(compareLatest)[0];
}

export function recalculateLifecycleModule(module: DrawingModule): DrawingModule {
  const activeItems = module.items.filter((item) => !item.deletedAt);
  const activeIds = new Set(activeItems.map((item) => item.itemId));
  const currentCover = module.coverDocumentId && activeIds.has(module.coverDocumentId)
    ? module.coverDocumentId
    : chooseCoverItem(activeItems)?.itemId;
  const nextItems = activeItems.map((item) => ({
    ...item,
    isCover: currentCover ? item.itemId === currentCover : undefined,
  }));

  return {
    ...module,
    items: nextItems,
    status: nextItems.length ? 'uploaded' : module.moduleKey === 'original_drawing' ? 'no_drawing' : 'pending',
    itemCount: nextItems.length,
    coverDocumentId: currentCover || undefined,
    updatedAt: new Date().toISOString(),
  };
}

export function deriveLifecycleDrawingStatus(modules: DrawingModule[]): DrawingStatus {
  const original = modules.find((module) => module.moduleKey === 'original_drawing');
  const originalCount = original?.items.filter((item) => !item.deletedAt).length ?? 0;
  const totalCount = modules.reduce((sum, module) => sum + module.items.filter((item) => !item.deletedAt).length, 0);
  if (originalCount > 0) return 'available';
  if (totalCount > 0) return 'partial';
  return 'no_drawing';
}

export function recalculateLifecycleDetail(detail: ProductDrawingDetail): ProductDrawingDetail {
  const modules = detail.modules.map(recalculateLifecycleModule);
  return {
    ...detail,
    product: {
      ...detail.product,
      drawingStatus: deriveLifecycleDrawingStatus(modules),
      updatedAt: new Date().toISOString(),
    },
    modules,
  };
}
