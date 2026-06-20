import type {
  ConfirmationStatus,
  DocumentSource,
  DocumentStatus,
  DocumentTypeV03,
  MaterialStatus,
  PlanStatus,
  ProcessSegment,
  RequiredProcess,
} from '../../common/enums/production.enum';

export const processToPrisma: Record<ProcessSegment | RequiredProcess, string> = {
  前段: 'FRONT',
  后段: 'BACK',
  通用: 'COMMON',
  front: 'FRONT',
  back: 'BACK',
  common: 'COMMON',
};

export const planStatusToPrisma: Record<PlanStatus, string> = {
  待生产: 'PENDING',
  生产中: 'IN_PROGRESS',
  已完成: 'COMPLETED',
  异常: 'EXCEPTION',
};

export const confirmStatusToPrisma: Record<ConfirmationStatus, string> = {
  未确认: 'UNCONFIRMED',
  已确认: 'CONFIRMED',
  需复核: 'NEED_REVIEW',
};

export const materialStatusToDocumentStatus: Record<MaterialStatus, DocumentStatus> = {
  有效: 'effective',
  待确认: 'pending_review',
  失效: 'expired',
};

export const documentStatusToPrisma: Record<DocumentStatus, string> = {
  effective: 'EFFECTIVE',
  pending_review: 'PENDING_REVIEW',
  expired: 'EXPIRED',
  missing: 'MISSING',
  inconsistent: 'INCONSISTENT',
};

export const documentTypeToPrisma: Record<DocumentTypeV03, string> = {
  drawing_pdf: 'DRAWING_PDF',
  sop_image: 'SOP_IMAGE',
  connector_manual: 'CONNECTOR_MANUAL',
  pinout_diagram: 'PINOUT_DIAGRAM',
  finished_detail_image: 'FINISHED_DETAIL_IMAGE',
  process_card: 'PROCESS_CARD',
};

export const documentSourceToPrisma: Record<DocumentSource, string> = {
  mock: 'MOCK',
  wecom_disk: 'WECOM_DISK',
  manual_upload: 'MANUAL_UPLOAD',
  pdf_import: 'MANUAL_UPLOAD',
};

export function nullable<T>(value: T | undefined | null) {
  return value === undefined || value === null || value === '' ? undefined : value;
}
