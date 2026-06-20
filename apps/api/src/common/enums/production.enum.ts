export type ProcessSegment = '前段' | '后段' | '通用';
export type PlanStatus = '待生产' | '生产中' | '已完成' | '异常';
export type ConfirmationStatus = '未确认' | '已确认' | '需复核';
export type MaterialStatus = '有效' | '待确认' | '失效';
export type LegacyDocumentType = 'drawing' | 'sop' | 'pin-map' | 'finish';

export type DocumentTypeV03 =
  | 'drawing_pdf'
  | 'sop_image'
  | 'connector_manual'
  | 'pinout_diagram'
  | 'finished_detail_image'
  | 'process_card';

export type DocumentStatus =
  | 'effective'
  | 'pending_review'
  | 'expired'
  | 'missing'
  | 'inconsistent';

export type DocumentSource = 'mock' | 'wecom_disk' | 'manual_upload' | 'pdf_import';
export type RequiredProcess = 'front' | 'back' | 'common';
export type PreviewType = 'pdf' | 'image' | 'card';
export type ReadinessStatus = 'ready' | 'need_review' | 'blocked';
export type CheckItemStatus = 'pass' | 'warning' | 'fail';

export type SearchResultType =
  | 'plan'
  | 'front-parameter'
  | 'back-document'
  | 'drawing'
  | 'sop'
  | 'connector'
  | 'detail-image'
  | 'fixture'
  | 'abnormal_case'
  | 'quality_standard';

export type SearchScope = 'current_plan' | 'global';

export type AuditEntityType = 'document' | 'plan' | 'feedback' | 'file' | 'system' | 'import' | 'knowledge' | 'product';

export type AuditAction =
  | 'document_uploaded'
  | 'pdf_drawing_imported'
  | 'pdf_import_product_created'
  | 'document_status_changed'
  | 'document_version_changed'
  | 'document_set_effective'
  | 'document_archived'
  | 'document_previewed'
  | 'document_downloaded'
  | 'readiness_recalculated'
  | 'migration_preview_generated'
  | 'business_data_imported'
  | 'maintenance_recorded';

export const documentStatusLabelMap: Record<DocumentStatus, MaterialStatus> = {
  effective: '有效',
  pending_review: '待确认',
  expired: '失效',
  missing: '失效',
  inconsistent: '失效',
};

export const legacyDocumentTypeMap: Record<DocumentTypeV03, LegacyDocumentType> = {
  drawing_pdf: 'drawing',
  sop_image: 'sop',
  connector_manual: 'sop',
  pinout_diagram: 'pin-map',
  finished_detail_image: 'finish',
  process_card: 'sop',
};
