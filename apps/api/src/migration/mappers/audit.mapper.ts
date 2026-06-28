import type { AuditAction, AuditEntityType } from '../../common/enums/production.enum';
import type { AuditLog } from '../../common/types/production.types';

const entityToPrisma: Record<AuditEntityType, string> = {
  document: 'DOCUMENT',
  plan: 'PLAN',
  feedback: 'FEEDBACK',
  file: 'FILE',
  system: 'SYSTEM',
  import: 'IMPORT',
  knowledge: 'KNOWLEDGE',
  product: 'IMPORT',
};

const actionToPrisma: Record<AuditAction, string> = {
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

export function mapAuditLogToPrisma(log: AuditLog) {
  return {
    id: log.auditId,
    entityType: entityToPrisma[log.entityType],
    entityId: log.entityId,
    action: actionToPrisma[log.action],
    beforeJson: log.before,
    afterJson: log.after,
    message: log.message,
    operatorId: log.operatorId,
    operatorName: log.operatorName,
    operatorRole: log.operatorRole,
    planId: log.planId,
    productId: log.productId,
    createdAt: new Date(log.createdAt),
  };
}
