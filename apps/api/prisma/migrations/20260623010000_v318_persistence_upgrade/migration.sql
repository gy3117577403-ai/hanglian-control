-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentSource" ADD VALUE 'PDF_IMPORT';
ALTER TYPE "DocumentSource" ADD VALUE 'MANUAL_CREATE';
ALTER TYPE "DocumentSource" ADD VALUE 'FUTURE_WECOM';
ALTER TYPE "DocumentSource" ADD VALUE 'SEED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEntityType" ADD VALUE 'CUSTOMER';
ALTER TYPE "AuditEntityType" ADD VALUE 'PRODUCT';
ALTER TYPE "AuditEntityType" ADD VALUE 'PRODUCT_MODULE';
ALTER TYPE "AuditEntityType" ADD VALUE 'PDF_IMPORT_BATCH';
ALTER TYPE "AuditEntityType" ADD VALUE 'PDF_IMPORT_ITEM';
ALTER TYPE "AuditEntityType" ADD VALUE 'DELETE_LOCK';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CUSTOMER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CUSTOMER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PRODUCT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PRODUCT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PRODUCT_MODULE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'DOCUMENT_TRASHED';
ALTER TYPE "AuditAction" ADD VALUE 'DOCUMENT_RESTORED';
ALTER TYPE "AuditAction" ADD VALUE 'DOCUMENT_PURGED';
ALTER TYPE "AuditAction" ADD VALUE 'PDF_IMPORT_PREVIEWED';
ALTER TYPE "AuditAction" ADD VALUE 'PDF_IMPORT_APPLIED';
ALTER TYPE "AuditAction" ADD VALUE 'DELETE_LOCK_UPDATED';

-- DropIndex
DROP INDEX "Customer_name_key";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "aliases" JSONB,
ADD COLUMN     "customerCode" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerShortName" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "drawingStatus" TEXT NOT NULL DEFAULT 'no_drawing',
ADD COLUMN     "normalizedProductModel" TEXT NOT NULL,
ADD COLUMN     "productModel" TEXT,
ADD COLUMN     "remark" TEXT,
ADD COLUMN     "searchKeywords" JSONB,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'seed';

-- AlterTable
ALTER TABLE "ProductDocument" ADD COLUMN     "checksumSha256" TEXT,
ADD COLUMN     "contentKind" TEXT NOT NULL DEFAULT 'document',
ADD COLUMN     "deleteReason" TEXT,
ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "documentStatus" TEXT NOT NULL DEFAULT 'pending_review',
ADD COLUMN     "imageHeight" INTEGER,
ADD COLUMN     "imageWidth" INTEGER,
ADD COLUMN     "isCover" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "keywordMeta" JSONB,
ADD COLUMN     "moduleId" TEXT,
ADD COLUMN     "moduleKey" TEXT,
ADD COLUMN     "pageCount" INTEGER,
ADD COLUMN     "previewMode" TEXT,
ADD COLUMN     "restoredAt" TIMESTAMP(3),
ADD COLUMN     "restoredBy" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "orderId" TEXT;

-- CreateTable
CREATE TABLE "ProductionOrder" (
    "orderId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "productModel" TEXT NOT NULL,
    "normalizedProductModel" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "linkedProductId" TEXT,
    "productResolutionStatus" TEXT NOT NULL DEFAULT 'unknown',
    "quantity" INTEGER,
    "quantityProvided" BOOLEAN NOT NULL DEFAULT false,
    "productionStatus" TEXT NOT NULL DEFAULT 'no_drawing',
    "completionStatus" TEXT NOT NULL DEFAULT 'pending',
    "source" TEXT NOT NULL DEFAULT 'manual_create',
    "importBatchId" TEXT,
    "importItemId" TEXT,
    "remark" TEXT,
    "plannedDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "restoredAt" TIMESTAMP(3),
    "restoredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("orderId")
);

-- CreateTable
CREATE TABLE "OrderImportBatch" (
    "importBatchId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "fileName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'previewed',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "createOrderCount" INTEGER NOT NULL DEFAULT 0,
    "alreadyActiveCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateInFileCount" INTEGER NOT NULL DEFAULT 0,
    "needsConfirmationCount" INTEGER NOT NULL DEFAULT 0,
    "productNotFoundCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER,
    "skippedCount" INTEGER,
    "appliedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "operatorId" TEXT,
    "operatorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderImportBatch_pkey" PRIMARY KEY ("importBatchId")
);

-- CreateTable
CREATE TABLE "OrderImportItem" (
    "importItemId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawProductModel" TEXT NOT NULL,
    "productModel" TEXT NOT NULL,
    "normalizedProductModel" TEXT NOT NULL,
    "productResolutionStatus" TEXT NOT NULL DEFAULT 'unknown',
    "matchedCustomerId" TEXT,
    "matchedCustomerName" TEXT,
    "matchedProductId" TEXT,
    "recommendedProductionStatus" TEXT NOT NULL DEFAULT 'no_drawing',
    "action" TEXT NOT NULL DEFAULT 'error',
    "message" TEXT,
    "errorMessage" TEXT,
    "applyResult" TEXT,
    "applyMessage" TEXT,
    "applyErrorMessage" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderImportItem_pkey" PRIMARY KEY ("importItemId")
);

-- CreateTable
CREATE TABLE "ProductModule" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "moduleName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'empty',
    "remark" TEXT,
    "coverDocumentId" TEXT,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdfImportBatch" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'previewed',
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "needsConfirmationCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "applyStatus" TEXT,
    "applySummary" JSONB,
    "remark" TEXT,
    "operatorId" TEXT,
    "operatorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PdfImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdfImportItem" (
    "id" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "stagedFileKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "parsedProductModel" TEXT,
    "confirmedProductModel" TEXT,
    "parsedVersion" TEXT,
    "confirmedVersion" TEXT,
    "confidence" DOUBLE PRECISION,
    "needsConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "parseWarnings" JSONB,
    "existingProductId" TEXT,
    "existingDocumentId" TEXT,
    "action" TEXT NOT NULL DEFAULT 'needs_confirmation',
    "selected" BOOLEAN NOT NULL DEFAULT true,
    "setAsEffective" BOOLEAN NOT NULL DEFAULT false,
    "productName" TEXT,
    "result" TEXT NOT NULL DEFAULT 'needs_confirmation',
    "resultProductId" TEXT,
    "resultDocumentId" TEXT,
    "message" TEXT,
    "errorMessage" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PdfImportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeleteLockSetting" (
    "id" TEXT NOT NULL DEFAULT 'document-delete-lock',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "passwordHash" TEXT NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeleteLockSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrder_importItemId_key" ON "ProductionOrder"("importItemId");

-- CreateIndex
CREATE INDEX "ProductionOrder_scope_idx" ON "ProductionOrder"("scope");

-- CreateIndex
CREATE INDEX "ProductionOrder_normalizedProductModel_idx" ON "ProductionOrder"("normalizedProductModel");

-- CreateIndex
CREATE INDEX "ProductionOrder_customerId_idx" ON "ProductionOrder"("customerId");

-- CreateIndex
CREATE INDEX "ProductionOrder_linkedProductId_idx" ON "ProductionOrder"("linkedProductId");

-- CreateIndex
CREATE INDEX "ProductionOrder_productResolutionStatus_idx" ON "ProductionOrder"("productResolutionStatus");

-- CreateIndex
CREATE INDEX "ProductionOrder_productionStatus_idx" ON "ProductionOrder"("productionStatus");

-- CreateIndex
CREATE INDEX "ProductionOrder_completionStatus_idx" ON "ProductionOrder"("completionStatus");

-- CreateIndex
CREATE INDEX "ProductionOrder_source_idx" ON "ProductionOrder"("source");

-- CreateIndex
CREATE INDEX "ProductionOrder_importBatchId_idx" ON "ProductionOrder"("importBatchId");

-- CreateIndex
CREATE INDEX "ProductionOrder_importItemId_idx" ON "ProductionOrder"("importItemId");

-- CreateIndex
CREATE INDEX "ProductionOrder_plannedDate_idx" ON "ProductionOrder"("plannedDate");

-- CreateIndex
CREATE INDEX "ProductionOrder_completedAt_idx" ON "ProductionOrder"("completedAt");

-- CreateIndex
CREATE INDEX "ProductionOrder_deletedAt_idx" ON "ProductionOrder"("deletedAt");

-- CreateIndex
CREATE INDEX "ProductionOrder_scope_completionStatus_deletedAt_idx" ON "ProductionOrder"("scope", "completionStatus", "deletedAt");

-- CreateIndex
CREATE INDEX "ProductionOrder_scope_normalizedProductModel_completionStat_idx" ON "ProductionOrder"("scope", "normalizedProductModel", "completionStatus", "deletedAt");

-- CreateIndex
CREATE INDEX "OrderImportBatch_scope_idx" ON "OrderImportBatch"("scope");

-- CreateIndex
CREATE INDEX "OrderImportBatch_status_idx" ON "OrderImportBatch"("status");

-- CreateIndex
CREATE INDEX "OrderImportBatch_expiresAt_idx" ON "OrderImportBatch"("expiresAt");

-- CreateIndex
CREATE INDEX "OrderImportBatch_appliedAt_idx" ON "OrderImportBatch"("appliedAt");

-- CreateIndex
CREATE INDEX "OrderImportBatch_createdAt_idx" ON "OrderImportBatch"("createdAt");

-- CreateIndex
CREATE INDEX "OrderImportBatch_updatedAt_idx" ON "OrderImportBatch"("updatedAt");

-- CreateIndex
CREATE INDEX "OrderImportItem_importBatchId_idx" ON "OrderImportItem"("importBatchId");

-- CreateIndex
CREATE INDEX "OrderImportItem_rowNumber_idx" ON "OrderImportItem"("rowNumber");

-- CreateIndex
CREATE INDEX "OrderImportItem_normalizedProductModel_idx" ON "OrderImportItem"("normalizedProductModel");

-- CreateIndex
CREATE INDEX "OrderImportItem_productResolutionStatus_idx" ON "OrderImportItem"("productResolutionStatus");

-- CreateIndex
CREATE INDEX "OrderImportItem_matchedCustomerId_idx" ON "OrderImportItem"("matchedCustomerId");

-- CreateIndex
CREATE INDEX "OrderImportItem_matchedProductId_idx" ON "OrderImportItem"("matchedProductId");

-- CreateIndex
CREATE INDEX "OrderImportItem_recommendedProductionStatus_idx" ON "OrderImportItem"("recommendedProductionStatus");

-- CreateIndex
CREATE INDEX "OrderImportItem_action_idx" ON "OrderImportItem"("action");

-- CreateIndex
CREATE INDEX "OrderImportItem_applyResult_idx" ON "OrderImportItem"("applyResult");

-- CreateIndex
CREATE INDEX "OrderImportItem_appliedAt_idx" ON "OrderImportItem"("appliedAt");

-- CreateIndex
CREATE INDEX "OrderImportItem_createdAt_idx" ON "OrderImportItem"("createdAt");

-- CreateIndex
CREATE INDEX "ProductModule_productId_idx" ON "ProductModule"("productId");

-- CreateIndex
CREATE INDEX "ProductModule_moduleKey_idx" ON "ProductModule"("moduleKey");

-- CreateIndex
CREATE INDEX "ProductModule_status_idx" ON "ProductModule"("status");

-- CreateIndex
CREATE INDEX "ProductModule_coverDocumentId_idx" ON "ProductModule"("coverDocumentId");

-- CreateIndex
CREATE INDEX "ProductModule_updatedAt_idx" ON "ProductModule"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductModule_productId_moduleKey_key" ON "ProductModule"("productId", "moduleKey");

-- CreateIndex
CREATE INDEX "PdfImportBatch_customerId_idx" ON "PdfImportBatch"("customerId");

-- CreateIndex
CREATE INDEX "PdfImportBatch_status_idx" ON "PdfImportBatch"("status");

-- CreateIndex
CREATE INDEX "PdfImportBatch_expiresAt_idx" ON "PdfImportBatch"("expiresAt");

-- CreateIndex
CREATE INDEX "PdfImportBatch_createdAt_idx" ON "PdfImportBatch"("createdAt");

-- CreateIndex
CREATE INDEX "PdfImportBatch_appliedAt_idx" ON "PdfImportBatch"("appliedAt");

-- CreateIndex
CREATE INDEX "PdfImportItem_importBatchId_idx" ON "PdfImportItem"("importBatchId");

-- CreateIndex
CREATE INDEX "PdfImportItem_checksumSha256_idx" ON "PdfImportItem"("checksumSha256");

-- CreateIndex
CREATE INDEX "PdfImportItem_action_idx" ON "PdfImportItem"("action");

-- CreateIndex
CREATE INDEX "PdfImportItem_result_idx" ON "PdfImportItem"("result");

-- CreateIndex
CREATE INDEX "PdfImportItem_existingProductId_idx" ON "PdfImportItem"("existingProductId");

-- CreateIndex
CREATE INDEX "PdfImportItem_resultProductId_idx" ON "PdfImportItem"("resultProductId");

-- CreateIndex
CREATE INDEX "PdfImportItem_existingDocumentId_idx" ON "PdfImportItem"("existingDocumentId");

-- CreateIndex
CREATE INDEX "PdfImportItem_resultDocumentId_idx" ON "PdfImportItem"("resultDocumentId");

-- CreateIndex
CREATE INDEX "PdfImportItem_appliedAt_idx" ON "PdfImportItem"("appliedAt");

-- CreateIndex
CREATE INDEX "PdfImportItem_createdAt_idx" ON "PdfImportItem"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PdfImportItem_importBatchId_id_key" ON "PdfImportItem"("importBatchId", "id");

-- CreateIndex
CREATE INDEX "DeleteLockSetting_enabled_idx" ON "DeleteLockSetting"("enabled");

-- CreateIndex
CREATE INDEX "DeleteLockSetting_lockedUntil_idx" ON "DeleteLockSetting"("lockedUntil");

-- CreateIndex
CREATE INDEX "Customer_customerName_idx" ON "Customer"("customerName");

-- CreateIndex
CREATE INDEX "Customer_customerCode_idx" ON "Customer"("customerCode");

-- CreateIndex
CREATE INDEX "Customer_status_idx" ON "Customer"("status");

-- CreateIndex
CREATE INDEX "Product_normalizedProductModel_idx" ON "Product"("normalizedProductModel");

-- CreateIndex
CREATE INDEX "Product_drawingStatus_idx" ON "Product"("drawingStatus");

-- CreateIndex
CREATE INDEX "Product_updatedAt_idx" ON "Product"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_customerId_normalizedProductModel_key" ON "Product"("customerId", "normalizedProductModel");

-- CreateIndex
CREATE INDEX "ProductDocument_moduleId_idx" ON "ProductDocument"("moduleId");

-- CreateIndex
CREATE INDEX "ProductDocument_moduleKey_idx" ON "ProductDocument"("moduleKey");

-- CreateIndex
CREATE INDEX "ProductDocument_documentStatus_idx" ON "ProductDocument"("documentStatus");

-- CreateIndex
CREATE INDEX "ProductDocument_checksumSha256_idx" ON "ProductDocument"("checksumSha256");

-- CreateIndex
CREATE INDEX "ProductDocument_deleted_idx" ON "ProductDocument"("deleted");

-- CreateIndex
CREATE INDEX "ProductDocument_createdAt_idx" ON "ProductDocument"("createdAt");

-- CreateIndex
CREATE INDEX "ProductDocument_updatedAt_idx" ON "ProductDocument"("updatedAt");

-- CreateIndex
CREATE INDEX "ProductDocument_productId_moduleKey_deleted_idx" ON "ProductDocument"("productId", "moduleKey", "deleted");

-- CreateIndex
CREATE INDEX "ProductDocument_productId_moduleKey_checksumSha256_idx" ON "ProductDocument"("productId", "moduleKey", "checksumSha256");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_customerId_idx" ON "AuditLog"("customerId");

-- CreateIndex
CREATE INDEX "AuditLog_orderId_idx" ON "AuditLog"("orderId");

-- CreateIndex
CREATE INDEX "AuditLog_operatorId_idx" ON "AuditLog"("operatorId");

-- CreateIndex
CREATE INDEX "QueryLog_userId_idx" ON "QueryLog"("userId");

-- CreateIndex
CREATE INDEX "ConfirmationRecord_userId_idx" ON "ConfirmationRecord"("userId");

-- CreateIndex
CREATE INDEX "FeedbackRecord_userId_idx" ON "FeedbackRecord"("userId");

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_linkedProductId_fkey" FOREIGN KEY ("linkedProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "OrderImportBatch"("importBatchId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_importItemId_fkey" FOREIGN KEY ("importItemId") REFERENCES "OrderImportItem"("importItemId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderImportItem" ADD CONSTRAINT "OrderImportItem_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "OrderImportBatch"("importBatchId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDocument" ADD CONSTRAINT "ProductDocument_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ProductModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductModule" ADD CONSTRAINT "ProductModule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductModule" ADD CONSTRAINT "ProductModule_coverDocumentId_fkey" FOREIGN KEY ("coverDocumentId") REFERENCES "ProductDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdfImportBatch" ADD CONSTRAINT "PdfImportBatch_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdfImportItem" ADD CONSTRAINT "PdfImportItem_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "PdfImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdfImportItem" ADD CONSTRAINT "PdfImportItem_existingProductId_fkey" FOREIGN KEY ("existingProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdfImportItem" ADD CONSTRAINT "PdfImportItem_existingDocumentId_fkey" FOREIGN KEY ("existingDocumentId") REFERENCES "ProductDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdfImportItem" ADD CONSTRAINT "PdfImportItem_resultProductId_fkey" FOREIGN KEY ("resultProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdfImportItem" ADD CONSTRAINT "PdfImportItem_resultDocumentId_fkey" FOREIGN KEY ("resultDocumentId") REFERENCES "ProductDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
