import type { ProductDocument } from '../../common/types/production.types';
import {
  documentSourceToPrisma,
  documentStatusToPrisma,
  documentTypeToPrisma,
  nullable,
  processToPrisma,
} from './shared';

export function mapProductDocumentToPrisma(document: ProductDocument) {
  const documentType = document.documentType ?? 'process_card';
  const requiredForProcess = document.requiredForProcess ?? 'common';
  return {
    id: document.documentId ?? document.id,
    productId: document.productId,
    productionPlanId: nullable(document.planId),
    documentType: documentTypeToPrisma[documentType],
    versionGroupKey: document.versionGroupKey ?? `${document.productId}::${documentType}::${requiredForProcess}`,
    title: document.title,
    version: document.version,
    status: documentStatusToPrisma[document.documentStatus ?? 'pending_review'],
    source: documentSourceToPrisma[document.source ?? 'mock'],
    requiredForProcess: processToPrisma[requiredForProcess],
    previewType: document.previewType ?? 'card',
    originalFileName: nullable(document.originalFileName),
    storedFileName: nullable(document.storedFileName),
    mimeType: nullable(document.mimeType),
    fileSize: document.fileSize,
    previewUrl: nullable(document.previewUrl),
    downloadUrl: nullable(document.downloadUrl),
    storageProvider: document.source === 'manual_upload' || document.source === 'pdf_import' ? 'local' : 'mock',
    storageKey: nullable(document.storedFileName),
    mockPreviewText: document.mockPreviewText,
    keywords: document.keywords ?? [],
    remark: nullable(document.remark ?? document.description),
    effectiveDate: document.effectiveDate ? new Date(`${document.effectiveDate}T00:00:00.000Z`) : undefined,
    archived: document.archived ?? false,
    archivedAt: document.archivedAt ? new Date(document.archivedAt) : undefined,
    archivedBy: nullable(document.archivedBy),
  };
}
