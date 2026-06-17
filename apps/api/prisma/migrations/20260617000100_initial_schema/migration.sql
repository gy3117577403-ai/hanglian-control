-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'FRONT_LEADER', 'BACK_LEADER', 'QUALITY', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProcessSegment" AS ENUM ('FRONT', 'BACK', 'COMMON');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "ConfirmStatus" AS ENUM ('UNCONFIRMED', 'CONFIRMED', 'NEED_REVIEW');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('DRAWING_PDF', 'SOP_IMAGE', 'CONNECTOR_MANUAL', 'PINOUT_DIAGRAM', 'FINISHED_DETAIL_IMAGE', 'PROCESS_CARD');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('EFFECTIVE', 'PENDING_REVIEW', 'EXPIRED', 'MISSING', 'INCONSISTENT');

-- CreateEnum
CREATE TYPE "DocumentSource" AS ENUM ('MOCK', 'WECOM_DISK', 'MANUAL_UPLOAD');

-- CreateEnum
CREATE TYPE "ReadinessStatus" AS ENUM ('READY', 'NEED_REVIEW', 'BLOCKED');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('MISSING_DOCUMENT', 'VERSION_EXCEPTION', 'PARAMETER_MISMATCH', 'UNCLEAR_DRAWING', 'SOP_SITE_MISMATCH', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('DOCUMENT', 'PLAN', 'FEEDBACK', 'FILE', 'SYSTEM', 'IMPORT', 'KNOWLEDGE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('DOCUMENT_UPLOADED', 'DOCUMENT_STATUS_CHANGED', 'DOCUMENT_VERSION_CHANGED', 'DOCUMENT_SET_EFFECTIVE', 'DOCUMENT_ARCHIVED', 'DOCUMENT_PREVIEWED', 'DOCUMENT_DOWNLOADED', 'READINESS_RECALCULATED', 'MIGRATION_PREVIEW_GENERATED', 'BUSINESS_DATA_IMPORTED', 'MAINTENANCE_RECORDED');

-- CreateEnum
CREATE TYPE "FixtureStatus" AS ENUM ('ACTIVE', 'PENDING_REVIEW', 'INACTIVE', 'ABNORMAL');

-- CreateEnum
CREATE TYPE "AbnormalSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AbnormalCaseStatus" AS ENUM ('ACTIVE', 'PENDING_REVIEW', 'CLOSED');

-- CreateEnum
CREATE TYPE "QualityDefectLevel" AS ENUM ('MINOR', 'MAJOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "QualityStandardStatus" AS ENUM ('EFFECTIVE', 'PENDING_REVIEW', 'EXPIRED');

-- CreateEnum
CREATE TYPE "KnowledgeEntityType" AS ENUM ('FIXTURE', 'ABNORMAL_CASE', 'QUALITY_STANDARD');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('NOT_STARTED', 'READY_TO_START', 'RUNNING', 'PAUSED', 'EXCEPTION_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExecutionEventType" AS ENUM ('PREPARE_START', 'START', 'PROCESS_CONFIRM', 'QUANTITY_REPORT', 'PAUSE', 'RESUME', 'EXCEPTION_HOLD', 'COMPLETE', 'CANCEL', 'HANDOVER');

-- CreateEnum
CREATE TYPE "ProcessConfirmType" AS ENUM ('FRONT_PARAMETER_CHECKED', 'BACK_DOCUMENT_CHECKED', 'FIXTURE_CHECKED', 'QUALITY_CHECKED', 'FIRST_PIECE_CHECKED', 'OTHER');

-- CreateEnum
CREATE TYPE "ProcessConfirmResult" AS ENUM ('PASS', 'WARNING', 'FAIL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "teamName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "salesOwner" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "currentVersion" TEXT NOT NULL,
    "processSegment" "ProcessSegment" NOT NULL DEFAULT 'COMMON',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionPlan" (
    "id" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "planDate" TIMESTAMP(3) NOT NULL,
    "weekPlanCode" TEXT NOT NULL,
    "sales" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "processSegment" "ProcessSegment" NOT NULL DEFAULT 'COMMON',
    "plannedQuantity" INTEGER NOT NULL,
    "completedQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" "PlanStatus" NOT NULL DEFAULT 'PENDING',
    "owner" TEXT NOT NULL,
    "materialCompleteness" INTEGER NOT NULL DEFAULT 0,
    "confirmStatus" "ConfirmStatus" NOT NULL DEFAULT 'UNCONFIRMED',
    "readinessStatus" "ReadinessStatus" NOT NULL DEFAULT 'NEED_REVIEW',
    "readinessScore" INTEGER NOT NULL DEFAULT 0,
    "readinessSummary" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDocument" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productionPlanId" TEXT,
    "documentType" "DocumentType" NOT NULL,
    "versionGroupKey" TEXT,
    "title" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "source" "DocumentSource" NOT NULL DEFAULT 'MOCK',
    "requiredForProcess" "ProcessSegment" NOT NULL DEFAULT 'COMMON',
    "previewType" TEXT NOT NULL,
    "originalFileName" TEXT,
    "storedFileName" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "previewUrl" TEXT,
    "downloadUrl" TEXT,
    "storageProvider" TEXT,
    "storageKey" TEXT,
    "checksum" TEXT,
    "mockPreviewText" TEXT,
    "keywords" TEXT[],
    "remark" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "archivedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "message" TEXT NOT NULL,
    "operatorId" TEXT,
    "operatorName" TEXT,
    "operatorRole" TEXT,
    "planId" TEXT,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrontProcessParameter" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "wireLength" TEXT NOT NULL,
    "strippingLength" TEXT NOT NULL,
    "terminalModel" TEXT NOT NULL,
    "pullForceStandard" TEXT NOT NULL,
    "crimpHeight" TEXT NOT NULL,
    "drawingVersion" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "effectiveFrom" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FrontProcessParameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackProcessPackage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "connectorModel" TEXT NOT NULL,
    "assemblyManual" TEXT NOT NULL,
    "pinMap" TEXT NOT NULL,
    "sop" TEXT NOT NULL,
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "drawingVersion" TEXT NOT NULL,
    "sopVersion" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "effectiveFrom" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackProcessPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueryLog" (
    "id" TEXT NOT NULL,
    "productionPlanId" TEXT,
    "userId" TEXT,
    "keyword" TEXT NOT NULL,
    "querySource" TEXT NOT NULL,
    "resultSummary" TEXT,
    "deviceInfo" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfirmationRecord" (
    "id" TEXT NOT NULL,
    "productionPlanId" TEXT NOT NULL,
    "userId" TEXT,
    "status" "ConfirmStatus" NOT NULL DEFAULT 'CONFIRMED',
    "role" TEXT,
    "versionSnapshot" JSONB,
    "remark" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfirmationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackRecord" (
    "id" TEXT NOT NULL,
    "productionPlanId" TEXT NOT NULL,
    "userId" TEXT,
    "feedbackType" "FeedbackType" NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "FeedbackRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fixture" (
    "id" TEXT NOT NULL,
    "fixtureCode" TEXT NOT NULL,
    "fixtureName" TEXT NOT NULL,
    "fixtureType" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "processSegment" "ProcessSegment" NOT NULL DEFAULT 'COMMON',
    "applicableStation" TEXT NOT NULL,
    "usageMethod" TEXT NOT NULL,
    "checkStandard" TEXT NOT NULL,
    "maintenanceCycle" TEXT NOT NULL,
    "lastMaintenanceDate" TIMESTAMP(3),
    "nextMaintenanceDate" TIMESTAMP(3),
    "status" "FixtureStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "images" JSONB,
    "relatedDocumentIds" TEXT[],
    "keywords" TEXT[],
    "remark" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fixture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbnormalCase" (
    "id" TEXT NOT NULL,
    "abnormalCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "processSegment" "ProcessSegment" NOT NULL DEFAULT 'COMMON',
    "station" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "symptom" TEXT NOT NULL,
    "cause" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "prevention" TEXT NOT NULL,
    "severity" "AbnormalSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "AbnormalCaseStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "relatedDocumentIds" TEXT[],
    "relatedFixtureIds" TEXT[],
    "keywords" TEXT[],
    "remark" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbnormalCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityStandard" (
    "id" TEXT NOT NULL,
    "qualityCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "processSegment" "ProcessSegment" NOT NULL DEFAULT 'COMMON',
    "inspectionItem" TEXT NOT NULL,
    "standardValue" TEXT NOT NULL,
    "tolerance" TEXT NOT NULL,
    "inspectionMethod" TEXT NOT NULL,
    "samplingRule" TEXT NOT NULL,
    "defectLevel" "QualityDefectLevel" NOT NULL DEFAULT 'MAJOR',
    "status" "QualityStandardStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "relatedDocumentIds" TEXT[],
    "keywords" TEXT[],
    "remark" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityStandard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeRecord" (
    "id" TEXT NOT NULL,
    "entityType" "KnowledgeEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "reason" TEXT,
    "operatorId" TEXT,
    "operatorName" TEXT,
    "operatorRole" TEXT,
    "productId" TEXT,
    "planId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionRecord" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "eventType" "ExecutionEventType" NOT NULL,
    "executionStatus" "ExecutionStatus" NOT NULL,
    "statusBefore" "ExecutionStatus",
    "statusAfter" "ExecutionStatus",
    "confirmType" "ProcessConfirmType",
    "result" "ProcessConfirmResult",
    "remark" TEXT,
    "operatorId" TEXT,
    "operatorName" TEXT,
    "operatorRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanStatusEvent" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "eventType" "ExecutionEventType" NOT NULL,
    "fromStatus" "ExecutionStatus",
    "toStatus" "ExecutionStatus" NOT NULL,
    "message" TEXT NOT NULL,
    "operatorId" TEXT,
    "operatorName" TEXT,
    "operatorRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuantityReport" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "completedQuantity" INTEGER NOT NULL,
    "defectQuantity" INTEGER NOT NULL DEFAULT 0,
    "reworkQuantity" INTEGER NOT NULL DEFAULT 0,
    "scrapQuantity" INTEGER NOT NULL DEFAULT 0,
    "cumulativeCompletedQuantity" INTEGER NOT NULL,
    "planQuantity" INTEGER NOT NULL,
    "warning" TEXT,
    "remark" TEXT,
    "operatorId" TEXT,
    "operatorName" TEXT,
    "operatorRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuantityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftHandoverRecord" (
    "id" TEXT NOT NULL,
    "fromTeam" TEXT NOT NULL,
    "toTeam" TEXT NOT NULL,
    "planIds" TEXT[],
    "summary" TEXT NOT NULL,
    "riskItems" TEXT[],
    "unfinishedItems" TEXT[],
    "operatorId" TEXT,
    "operatorName" TEXT,
    "operatorRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftHandoverRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "settingKey" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "remark" TEXT,
    "operatorId" TEXT,
    "operatorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DictionarySetting" (
    "id" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "description" TEXT,
    "itemsJson" JSONB NOT NULL,
    "operatorId" TEXT,
    "operatorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DictionarySetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationProfile" (
    "id" TEXT NOT NULL,
    "stationCode" TEXT NOT NULL,
    "stationName" TEXT NOT NULL,
    "processSegment" TEXT NOT NULL,
    "defaultRole" TEXT NOT NULL,
    "defaultTeam" TEXT NOT NULL,
    "defaultPlanScope" TEXT NOT NULL,
    "defaultTabs" TEXT[],
    "enabledQuickActions" TEXT[],
    "showKnowledgePanel" BOOLEAN NOT NULL DEFAULT true,
    "showExecutionPanel" BOOLEAN NOT NULL DEFAULT true,
    "showAnalyticsPanel" BOOLEAN NOT NULL DEFAULT false,
    "fieldModeDefault" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisplaySetting" (
    "id" TEXT NOT NULL,
    "settingKey" TEXT NOT NULL,
    "fontScale" TEXT NOT NULL,
    "cardDensity" TEXT NOT NULL,
    "defaultFieldMode" BOOLEAN NOT NULL DEFAULT true,
    "showDemoBadges" BOOLEAN NOT NULL DEFAULT true,
    "showTechnicalWarnings" BOOLEAN NOT NULL DEFAULT true,
    "enableWarmAnimations" BOOLEAN NOT NULL DEFAULT true,
    "defaultTheme" TEXT NOT NULL DEFAULT 'warm_3d',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisplaySetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "operatorId" TEXT,
    "operatorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemFeedback" (
    "id" TEXT NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "currentPage" TEXT,
    "role" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "screenshotRemark" TEXT,
    "expectedResult" TEXT,
    "actualResult" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolverName" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PilotCheckRecord" (
    "id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "itemsJson" JSONB NOT NULL,
    "operatorId" TEXT,
    "operatorName" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PilotCheckRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettingsRecord" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "reason" TEXT,
    "operatorId" TEXT,
    "operatorName" TEXT,
    "operatorRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SettingsRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_name_key" ON "Customer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Customer_deletedAt_idx" ON "Customer"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_productCode_key" ON "Product"("productCode");

-- CreateIndex
CREATE INDEX "Product_customerId_idx" ON "Product"("customerId");

-- CreateIndex
CREATE INDEX "Product_processSegment_idx" ON "Product"("processSegment");

-- CreateIndex
CREATE INDEX "Product_deletedAt_idx" ON "Product"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionPlan_planCode_key" ON "ProductionPlan"("planCode");

-- CreateIndex
CREATE INDEX "ProductionPlan_planDate_idx" ON "ProductionPlan"("planDate");

-- CreateIndex
CREATE INDEX "ProductionPlan_weekPlanCode_idx" ON "ProductionPlan"("weekPlanCode");

-- CreateIndex
CREATE INDEX "ProductionPlan_productId_idx" ON "ProductionPlan"("productId");

-- CreateIndex
CREATE INDEX "ProductionPlan_status_idx" ON "ProductionPlan"("status");

-- CreateIndex
CREATE INDEX "ProductionPlan_readinessStatus_idx" ON "ProductionPlan"("readinessStatus");

-- CreateIndex
CREATE INDEX "ProductionPlan_deletedAt_idx" ON "ProductionPlan"("deletedAt");

-- CreateIndex
CREATE INDEX "ProductDocument_productId_documentType_idx" ON "ProductDocument"("productId", "documentType");

-- CreateIndex
CREATE INDEX "ProductDocument_versionGroupKey_idx" ON "ProductDocument"("versionGroupKey");

-- CreateIndex
CREATE INDEX "ProductDocument_productionPlanId_idx" ON "ProductDocument"("productionPlanId");

-- CreateIndex
CREATE INDEX "ProductDocument_status_idx" ON "ProductDocument"("status");

-- CreateIndex
CREATE INDEX "ProductDocument_source_idx" ON "ProductDocument"("source");

-- CreateIndex
CREATE INDEX "ProductDocument_archived_idx" ON "ProductDocument"("archived");

-- CreateIndex
CREATE INDEX "ProductDocument_deletedAt_idx" ON "ProductDocument"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductDocument_productId_documentType_requiredForProcess_v_key" ON "ProductDocument"("productId", "documentType", "requiredForProcess", "version");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_planId_idx" ON "AuditLog"("planId");

-- CreateIndex
CREATE INDEX "AuditLog_productId_idx" ON "AuditLog"("productId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "FrontProcessParameter_productId_idx" ON "FrontProcessParameter"("productId");

-- CreateIndex
CREATE INDEX "FrontProcessParameter_terminalModel_idx" ON "FrontProcessParameter"("terminalModel");

-- CreateIndex
CREATE INDEX "FrontProcessParameter_status_idx" ON "FrontProcessParameter"("status");

-- CreateIndex
CREATE INDEX "FrontProcessParameter_deletedAt_idx" ON "FrontProcessParameter"("deletedAt");

-- CreateIndex
CREATE INDEX "BackProcessPackage_productId_idx" ON "BackProcessPackage"("productId");

-- CreateIndex
CREATE INDEX "BackProcessPackage_connectorModel_idx" ON "BackProcessPackage"("connectorModel");

-- CreateIndex
CREATE INDEX "BackProcessPackage_status_idx" ON "BackProcessPackage"("status");

-- CreateIndex
CREATE INDEX "BackProcessPackage_deletedAt_idx" ON "BackProcessPackage"("deletedAt");

-- CreateIndex
CREATE INDEX "QueryLog_productionPlanId_idx" ON "QueryLog"("productionPlanId");

-- CreateIndex
CREATE INDEX "QueryLog_createdAt_idx" ON "QueryLog"("createdAt");

-- CreateIndex
CREATE INDEX "QueryLog_deletedAt_idx" ON "QueryLog"("deletedAt");

-- CreateIndex
CREATE INDEX "ConfirmationRecord_productionPlanId_idx" ON "ConfirmationRecord"("productionPlanId");

-- CreateIndex
CREATE INDEX "ConfirmationRecord_createdAt_idx" ON "ConfirmationRecord"("createdAt");

-- CreateIndex
CREATE INDEX "ConfirmationRecord_deletedAt_idx" ON "ConfirmationRecord"("deletedAt");

-- CreateIndex
CREATE INDEX "FeedbackRecord_productionPlanId_idx" ON "FeedbackRecord"("productionPlanId");

-- CreateIndex
CREATE INDEX "FeedbackRecord_feedbackType_idx" ON "FeedbackRecord"("feedbackType");

-- CreateIndex
CREATE INDEX "FeedbackRecord_createdAt_idx" ON "FeedbackRecord"("createdAt");

-- CreateIndex
CREATE INDEX "FeedbackRecord_deletedAt_idx" ON "FeedbackRecord"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Fixture_fixtureCode_key" ON "Fixture"("fixtureCode");

-- CreateIndex
CREATE INDEX "Fixture_productId_idx" ON "Fixture"("productId");

-- CreateIndex
CREATE INDEX "Fixture_productId_processSegment_idx" ON "Fixture"("productId", "processSegment");

-- CreateIndex
CREATE INDEX "Fixture_productId_status_idx" ON "Fixture"("productId", "status");

-- CreateIndex
CREATE INDEX "Fixture_processSegment_idx" ON "Fixture"("processSegment");

-- CreateIndex
CREATE INDEX "Fixture_status_idx" ON "Fixture"("status");

-- CreateIndex
CREATE INDEX "Fixture_nextMaintenanceDate_idx" ON "Fixture"("nextMaintenanceDate");

-- CreateIndex
CREATE INDEX "Fixture_deletedAt_idx" ON "Fixture"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AbnormalCase_abnormalCode_key" ON "AbnormalCase"("abnormalCode");

-- CreateIndex
CREATE INDEX "AbnormalCase_productId_idx" ON "AbnormalCase"("productId");

-- CreateIndex
CREATE INDEX "AbnormalCase_productId_processSegment_idx" ON "AbnormalCase"("productId", "processSegment");

-- CreateIndex
CREATE INDEX "AbnormalCase_productId_severity_idx" ON "AbnormalCase"("productId", "severity");

-- CreateIndex
CREATE INDEX "AbnormalCase_processSegment_idx" ON "AbnormalCase"("processSegment");

-- CreateIndex
CREATE INDEX "AbnormalCase_severity_idx" ON "AbnormalCase"("severity");

-- CreateIndex
CREATE INDEX "AbnormalCase_status_idx" ON "AbnormalCase"("status");

-- CreateIndex
CREATE INDEX "AbnormalCase_deletedAt_idx" ON "AbnormalCase"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "QualityStandard_qualityCode_key" ON "QualityStandard"("qualityCode");

-- CreateIndex
CREATE INDEX "QualityStandard_productId_idx" ON "QualityStandard"("productId");

-- CreateIndex
CREATE INDEX "QualityStandard_productId_processSegment_idx" ON "QualityStandard"("productId", "processSegment");

-- CreateIndex
CREATE INDEX "QualityStandard_productId_status_idx" ON "QualityStandard"("productId", "status");

-- CreateIndex
CREATE INDEX "QualityStandard_processSegment_idx" ON "QualityStandard"("processSegment");

-- CreateIndex
CREATE INDEX "QualityStandard_defectLevel_idx" ON "QualityStandard"("defectLevel");

-- CreateIndex
CREATE INDEX "QualityStandard_status_idx" ON "QualityStandard"("status");

-- CreateIndex
CREATE INDEX "QualityStandard_deletedAt_idx" ON "QualityStandard"("deletedAt");

-- CreateIndex
CREATE INDEX "KnowledgeRecord_entityType_entityId_idx" ON "KnowledgeRecord"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "KnowledgeRecord_operatorId_idx" ON "KnowledgeRecord"("operatorId");

-- CreateIndex
CREATE INDEX "KnowledgeRecord_productId_idx" ON "KnowledgeRecord"("productId");

-- CreateIndex
CREATE INDEX "KnowledgeRecord_planId_idx" ON "KnowledgeRecord"("planId");

-- CreateIndex
CREATE INDEX "KnowledgeRecord_createdAt_idx" ON "KnowledgeRecord"("createdAt");

-- CreateIndex
CREATE INDEX "ExecutionRecord_planId_idx" ON "ExecutionRecord"("planId");

-- CreateIndex
CREATE INDEX "ExecutionRecord_executionStatus_idx" ON "ExecutionRecord"("executionStatus");

-- CreateIndex
CREATE INDEX "ExecutionRecord_operatorId_idx" ON "ExecutionRecord"("operatorId");

-- CreateIndex
CREATE INDEX "ExecutionRecord_createdAt_idx" ON "ExecutionRecord"("createdAt");

-- CreateIndex
CREATE INDEX "PlanStatusEvent_planId_idx" ON "PlanStatusEvent"("planId");

-- CreateIndex
CREATE INDEX "PlanStatusEvent_toStatus_idx" ON "PlanStatusEvent"("toStatus");

-- CreateIndex
CREATE INDEX "PlanStatusEvent_operatorId_idx" ON "PlanStatusEvent"("operatorId");

-- CreateIndex
CREATE INDEX "PlanStatusEvent_createdAt_idx" ON "PlanStatusEvent"("createdAt");

-- CreateIndex
CREATE INDEX "QuantityReport_planId_idx" ON "QuantityReport"("planId");

-- CreateIndex
CREATE INDEX "QuantityReport_operatorId_idx" ON "QuantityReport"("operatorId");

-- CreateIndex
CREATE INDEX "QuantityReport_createdAt_idx" ON "QuantityReport"("createdAt");

-- CreateIndex
CREATE INDEX "ShiftHandoverRecord_fromTeam_idx" ON "ShiftHandoverRecord"("fromTeam");

-- CreateIndex
CREATE INDEX "ShiftHandoverRecord_toTeam_idx" ON "ShiftHandoverRecord"("toTeam");

-- CreateIndex
CREATE INDEX "ShiftHandoverRecord_operatorId_idx" ON "ShiftHandoverRecord"("operatorId");

-- CreateIndex
CREATE INDEX "ShiftHandoverRecord_createdAt_idx" ON "ShiftHandoverRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_settingKey_key" ON "SystemSetting"("settingKey");

-- CreateIndex
CREATE INDEX "SystemSetting_settingKey_idx" ON "SystemSetting"("settingKey");

-- CreateIndex
CREATE INDEX "SystemSetting_updatedAt_idx" ON "SystemSetting"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DictionarySetting_groupKey_key" ON "DictionarySetting"("groupKey");

-- CreateIndex
CREATE INDEX "DictionarySetting_groupKey_idx" ON "DictionarySetting"("groupKey");

-- CreateIndex
CREATE INDEX "DictionarySetting_updatedAt_idx" ON "DictionarySetting"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StationProfile_stationCode_key" ON "StationProfile"("stationCode");

-- CreateIndex
CREATE INDEX "StationProfile_processSegment_idx" ON "StationProfile"("processSegment");

-- CreateIndex
CREATE INDEX "StationProfile_defaultRole_idx" ON "StationProfile"("defaultRole");

-- CreateIndex
CREATE INDEX "StationProfile_status_idx" ON "StationProfile"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DisplaySetting_settingKey_key" ON "DisplaySetting"("settingKey");

-- CreateIndex
CREATE INDEX "Announcement_active_idx" ON "Announcement"("active");

-- CreateIndex
CREATE INDEX "Announcement_type_idx" ON "Announcement"("type");

-- CreateIndex
CREATE INDEX "Announcement_severity_idx" ON "Announcement"("severity");

-- CreateIndex
CREATE INDEX "Announcement_updatedAt_idx" ON "Announcement"("updatedAt");

-- CreateIndex
CREATE INDEX "SystemFeedback_feedbackType_idx" ON "SystemFeedback"("feedbackType");

-- CreateIndex
CREATE INDEX "SystemFeedback_severity_idx" ON "SystemFeedback"("severity");

-- CreateIndex
CREATE INDEX "SystemFeedback_status_idx" ON "SystemFeedback"("status");

-- CreateIndex
CREATE INDEX "SystemFeedback_userId_idx" ON "SystemFeedback"("userId");

-- CreateIndex
CREATE INDEX "SystemFeedback_createdAt_idx" ON "SystemFeedback"("createdAt");

-- CreateIndex
CREATE INDEX "PilotCheckRecord_status_idx" ON "PilotCheckRecord"("status");

-- CreateIndex
CREATE INDEX "PilotCheckRecord_checkedAt_idx" ON "PilotCheckRecord"("checkedAt");

-- CreateIndex
CREATE INDEX "SettingsRecord_entityType_entityId_idx" ON "SettingsRecord"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "SettingsRecord_action_idx" ON "SettingsRecord"("action");

-- CreateIndex
CREATE INDEX "SettingsRecord_operatorId_idx" ON "SettingsRecord"("operatorId");

-- CreateIndex
CREATE INDEX "SettingsRecord_createdAt_idx" ON "SettingsRecord"("createdAt");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPlan" ADD CONSTRAINT "ProductionPlan_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDocument" ADD CONSTRAINT "ProductDocument_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDocument" ADD CONSTRAINT "ProductDocument_productionPlanId_fkey" FOREIGN KEY ("productionPlanId") REFERENCES "ProductionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrontProcessParameter" ADD CONSTRAINT "FrontProcessParameter_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackProcessPackage" ADD CONSTRAINT "BackProcessPackage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryLog" ADD CONSTRAINT "QueryLog_productionPlanId_fkey" FOREIGN KEY ("productionPlanId") REFERENCES "ProductionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryLog" ADD CONSTRAINT "QueryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfirmationRecord" ADD CONSTRAINT "ConfirmationRecord_productionPlanId_fkey" FOREIGN KEY ("productionPlanId") REFERENCES "ProductionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfirmationRecord" ADD CONSTRAINT "ConfirmationRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackRecord" ADD CONSTRAINT "FeedbackRecord_productionPlanId_fkey" FOREIGN KEY ("productionPlanId") REFERENCES "ProductionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackRecord" ADD CONSTRAINT "FeedbackRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbnormalCase" ADD CONSTRAINT "AbnormalCase_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityStandard" ADD CONSTRAINT "QualityStandard_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

