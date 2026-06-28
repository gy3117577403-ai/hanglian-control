# V3.18 PostgreSQL Data Mapping

| JSON Source | Prisma Model | Key Fields | Relations | Unique Rules |
| --- | --- | --- | --- | --- |
| `drawing-customers.json` | `Customer` | `customerId`, `customerName`, `customerShortName`, `aliases`, `status`, `deletedAt` | Products reference `customerId` | Normalized active customer name should be unique in app logic |
| `drawing-products.json` | `Product` | `productId`, `customerId`, `productModel`, `normalizedProductModel`, `drawingStatus`, `deletedAt` | Belongs to `Customer`; modules and documents reference `productId` | `customerId + normalizedProductModel` |
| `drawing-module-settings.json.details[].modules[]` | `ProductModule` | `productId`, `moduleKey`, `status`, `coverDocumentId`, `itemCount` | Belongs to `Product`; cover references `ProductDocument` | `productId + moduleKey` |
| `documents.json` and module items | `ProductDocument` | `documentId`, `productId`, `moduleKey`, `documentType`, `version`, `storageKey`, `checksumSha256`, `deletedAt` | Belongs to `Product`; may update module cover | `documentId`; effective version rules are enforced per version group |
| `drawing-import-records.json` | `PdfImportBatch` | `importBatchId`, `customerId`, `status`, `createdAt`, `appliedAt`, counts | Belongs to `Customer`; owns items | `importBatchId` |
| `drawing-import-records.json.items[]` | `PdfImportItem` | `importItemId`, `importBatchId`, `fileName`, `checksumSha256`, `action`, `status` | Belongs to `PdfImportBatch`; may reference product/document | `importItemId` |
| `production-orders.json` | Current order model / future `ProductionOrder` | `orderId`, `scope`, `productModel`, `linkedProductId`, `productionStatus`, `completionStatus` | May reference `Product` | `orderId`; active duplicate rules remain app-level |
| `order-import-records.json` | Order import batch/item model | `importBatchId`, `scope`, counts, items, applyItems | Owns order import items | `importBatchId`, `importItemId` |
| `audit-logs.json` | `AuditLog` | `entityType`, `entityId`, `action`, `createdAt`, `operatorId` | References business entity by type/id | Stable audit id or generated migration key |
| `delete-lock-settings.json` | `DeleteLockSetting` | `enabled`, `passwordHash`, `failedAttempts`, `lockedUntil`, `updatedAt` | Singleton setting | Singleton key |

Binary file content remains outside PostgreSQL. Only `storageKey`, size, checksum, preview metadata, and lifecycle fields are migrated.
