export type KnowledgeProcessSegment = 'front' | 'back' | 'common';
export type KnowledgeStatus = 'active' | 'pending_review' | 'inactive' | 'abnormal';
export type AbnormalSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AbnormalStatus = 'active' | 'pending_review' | 'closed';
export type QualityDefectLevel = 'minor' | 'major' | 'critical';
export type QualityStatus = 'effective' | 'pending_review' | 'expired';
export type KnowledgeRecordEntityType = 'fixture' | 'abnormal_case' | 'quality_standard';
export type KnowledgeSearchResultType = 'fixture' | 'abnormal_case' | 'quality_standard';

export interface KnowledgeCustomerProductFields {
  customerId: string;
  customerName: string;
  productId: string;
  productCode: string;
  productName: string;
  processSegment: KnowledgeProcessSegment;
  relatedDocumentIds: string[];
  keywords: string[];
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FixtureKnowledge extends KnowledgeCustomerProductFields {
  fixtureId: string;
  fixtureCode: string;
  fixtureName: string;
  fixtureType: string;
  applicableStation: string;
  usageMethod: string;
  checkStandard: string;
  maintenanceCycle: string;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  status: KnowledgeStatus;
  images?: string[];
}

export interface AbnormalCaseKnowledge extends KnowledgeCustomerProductFields {
  abnormalId: string;
  abnormalCode: string;
  title: string;
  station: string;
  category: string;
  symptom: string;
  cause: string;
  solution: string;
  prevention: string;
  severity: AbnormalSeverity;
  status: AbnormalStatus;
  relatedFixtureIds: string[];
}

export interface QualityStandardKnowledge extends KnowledgeCustomerProductFields {
  qualityId: string;
  qualityCode: string;
  title: string;
  inspectionItem: string;
  standardValue: string;
  tolerance: string;
  inspectionMethod: string;
  samplingRule: string;
  defectLevel: QualityDefectLevel;
  status: QualityStatus;
}

export interface KnowledgeSummary {
  planId?: string;
  productId: string;
  productCode: string;
  productName: string;
  fixtures: FixtureKnowledge[];
  abnormalCases: AbnormalCaseKnowledge[];
  qualityStandards: QualityStandardKnowledge[];
  updatedAt: string;
}

export interface KnowledgeSearchResult {
  id: string;
  planId?: string;
  productId: string;
  productCode: string;
  productName: string;
  type: KnowledgeSearchResultType;
  title: string;
  subtitle: string;
  matchedField: string;
  snippet: string;
  status: string;
}

export interface KnowledgeRecord {
  recordId: string;
  entityType: KnowledgeRecordEntityType;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  operatorId: string;
  operatorName: string;
  operatorRole: string;
  createdAt: string;
}

export interface KnowledgeOperator {
  userId?: string;
  name?: string;
  roleLabel?: string;
  operatorId?: string;
  operatorName?: string;
  operatorRole?: string;
}

