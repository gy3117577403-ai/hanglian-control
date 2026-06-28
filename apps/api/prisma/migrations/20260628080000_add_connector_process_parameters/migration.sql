CREATE TABLE "ConnectorProcessParameter" (
    "id" TEXT NOT NULL,
    "connectorModel" TEXT NOT NULL,
    "insertionLength" DOUBLE PRECISION NOT NULL,
    "outerStripLength" DOUBLE PRECISION,
    "innerStripLength" DOUBLE PRECISION NOT NULL,
    "remark" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectorProcessParameter_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConnectorProcessParameter_connectorModel_idx" ON "ConnectorProcessParameter"("connectorModel");
CREATE INDEX "ConnectorProcessParameter_status_idx" ON "ConnectorProcessParameter"("status");
CREATE INDEX "ConnectorProcessParameter_deletedAt_idx" ON "ConnectorProcessParameter"("deletedAt");
CREATE INDEX "ConnectorProcessParameter_updatedAt_idx" ON "ConnectorProcessParameter"("updatedAt");
