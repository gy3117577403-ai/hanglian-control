# V3.14 图纸业务数据模型草案

本阶段只定稿 PostgreSQL / Prisma 数据模型草案。运行时仍使用 Mock / JSON metadata，不连接数据库，不建表，不执行迁移，不执行 seed。

## 模型边界

| 业务对象 | Prisma 模型 | 说明 |
| --- | --- | --- |
| 客户 | `Customer` | 保留旧 `name/code/salesOwner`，补充图纸业务 `customerName/customerShortName/customerCode/aliases/status/deletedAt`。客户名称不做全局唯一，重复校验仍由业务层执行。 |
| 产品 | `Product` | 保留旧 `productCode/currentVersion/processSegment`，补充 `productModel/normalizedProductModel/drawingStatus/source/remark/searchKeywords/deletedAt`。 |
| 产品模块 | `ProductModule` | 每个产品使用六条模块记录，不拆成六张表；`productId + moduleKey` 唯一。 |
| 产品资料 | `ProductDocument` | 保留旧资料字段，补充图纸模块、文件索引、软删除、预览和有效版本字段。文件本体不进入数据库。 |
| PDF 导入批次 | `PdfImportBatch` | 保存导入预览、应用状态和批次级统计。批次作为审计历史，不随客户误删级联删除。 |
| PDF 导入条目 | `PdfImportItem` | 保存单个临时 PDF 的解析、确认、应用结果和 `stagedFileKey`。 |
| 删除锁 | `DeleteLockSetting` | 仅保存 `passwordHash`、锁定状态和失败次数；运行时本轮仍使用 JSON 删除锁。 |
| 审计日志 | `AuditLog` | 兼容客户、产品、资料、PDF 导入和删除生命周期动作，禁止保存密码、密钥和绝对存储路径。 |

## 固定业务值

| 字段 | 当前 schema 类型 | 允许值 |
| --- | --- | --- |
| `Product.drawingStatus` | `String` | `available`、`partial`、`no_drawing` |
| `Product.source` | `String` | `pdf_import`、`manual_create`、`future_wecom`、`seed` |
| `ProductModule.moduleKey` | `String` | `original_drawing`、`sop`、`finished_images`、`accessory_specs`、`notes`、`tooling` |
| `ProductModule.status` | `String` | `empty`、`uploaded`、`partial` |
| `PdfImportBatch.status` | `String` | `previewed`、`expired`、`applying`、`completed`、`partially_applied`、`failed` |
| `PdfImportItem.action` | `String` | `create_product`、`add_version`、`skip_duplicate`、`needs_confirmation`、`error` |
| `PdfImportItem.result` | `String` | `created_product`、`added_version`、`skipped_duplicate`、`needs_confirmation`、`skipped_by_user`、`error` |

当前保留 String 字段是为了降低旧数据迁移风险；未来若要收紧为 enum，应使用迁移 dry-run 先验证历史值覆盖率。

## JSON metadata 到 Prisma 映射

| JSON metadata | Prisma 模型 | 字段映射 |
| --- | --- | --- |
| `drawing-customers.json` | `Customer` | `customerId -> id`，`customerName -> customerName/name`，`customerShortName -> customerShortName`，`customerCode -> customerCode/code`，`aliases -> aliases`，`status -> status`，`deletedAt -> deletedAt`，`createdAt/updatedAt -> createdAt/updatedAt`。 |
| `drawing-products.json` | `Product` | `productId -> id`，`customerId -> customerId`，`productModel -> productModel`，规范化后的型号 -> `normalizedProductModel`，`productName -> productName`，`drawingStatus -> drawingStatus`，`source -> source`，`remark -> remark`，搜索词 -> `searchKeywords`，`deletedAt -> deletedAt`。 |
| `drawing-module-settings.json` | `ProductModule` | `moduleId -> id`，`productId -> productId`，`moduleKey -> moduleKey`，`moduleName -> moduleName`，`status -> status`，`remark -> remark`，封面资料 -> `coverDocumentId`，资料数量 -> `itemCount`。 |
| `documents.json` | `ProductDocument` | `documentId -> id`，`productId -> productId`，`moduleId -> moduleId`，`moduleKey -> moduleKey`，`title -> title`，`version -> version`，`contentKind/documentType -> contentKind/documentType`，`source -> source`，`storageProvider/storageKey -> storageProvider/storageKey`，`storedFileName/originalFileName -> storedFileName/originalFileName`，`mimeType/fileSize/checksumSha256 -> mimeType/fileSize/checksumSha256`，预览地址 -> `previewUrl/downloadUrl`，软删除信息 -> `deleted/deletedAt/deletedBy/deleteReason/restoredAt/restoredBy`。 |
| `drawing-import-records.json` | `PdfImportBatch` + `PdfImportItem` | 批次 ID -> `PdfImportBatch.id`，客户 -> `customerId`，批次状态和计数 -> `status/totalFiles/successCount/skippedCount/errorCount/needsConfirmationCount`；单文件解析结果 -> `PdfImportItem.parsedProductModel/confirmedProductModel/action/result/message/errorMessage`；临时文件 key -> `PdfImportItem.stagedFileKey`。 |
| `audit-logs.json` | `AuditLog` | `auditId -> id`，`entityType/entityId/action -> entityType/entityId/action`，`before/after -> beforeJson/afterJson`，`message -> message`，`operatorId/operatorName/operatorRole -> operatorId/operatorName/operatorRole`，`customerId/productId/planId -> customerId/productId/planId`。 |
| `delete-lock-settings.json` | `DeleteLockSetting` | 固定单例 key -> `id`，`enabled -> enabled`，bcrypt hash -> `passwordHash`，`failedAttempts -> failedAttempts`，`lockedUntil -> lockedUntil`，更新人 -> `updatedBy`。 |

## 关系和删除策略

| 关系 | 策略 | 原因 |
| --- | --- | --- |
| `Customer -> Product` | `Restrict` | 防止误删客户导致产品资料库级联丢失。 |
| `Customer -> PdfImportBatch` | `Restrict` | 导入批次是审计历史，不随客户误删。 |
| `Product -> ProductModule` | `Cascade` | 仅未来受保护的产品彻底删除流程可触发，当前 UI 不提供产品彻底删除。 |
| `Product -> ProductDocument` | `Restrict` | 优先保护文件索引和审计链路。 |
| `ProductModule -> ProductDocument` | `SetNull` | 模块结构调整时资料保留，资料仍有 `productId/moduleKey`。 |
| `ProductModule.coverDocument -> ProductDocument` | `SetNull` | 封面资料被删除时模块封面清空。 |
| `PdfImportBatch -> PdfImportItem` | `Cascade` | 批次内部临时条目可随批次清理。 |

## 约束和索引

| 模型 | 约束 / 索引 |
| --- | --- |
| `Customer` | `customerName/customerCode/status/deletedAt` 查询索引。 |
| `Product` | `@@unique([customerId, normalizedProductModel])`；`customerId/normalizedProductModel/drawingStatus/deletedAt/updatedAt` 索引。 |
| `ProductModule` | `@@unique([productId, moduleKey])`；`productId/moduleKey/status/coverDocumentId/updatedAt` 索引。 |
| `ProductDocument` | `moduleId/moduleKey/checksumSha256/documentStatus/deleted/createdAt/updatedAt` 索引；`[productId, moduleKey, deleted]` 和 `[productId, moduleKey, checksumSha256]` 复合索引。 |
| `PdfImportBatch` | `customerId/status/expiresAt/createdAt/appliedAt` 索引。 |
| `PdfImportItem` | `importBatchId/checksumSha256/action/result/existingProductId/resultProductId/appliedAt/createdAt` 索引；`[importBatchId, id]` 唯一约束。 |
| `AuditLog` | `entityType/entityId/action/customerId/productId/operatorId/createdAt` 索引。 |

## 文件和临时数据原则

- PDF、图片和其他文件本体不写入 PostgreSQL。
- `storageKey` 继续指向本地持久化卷，未来可指向对象存储。
- `stagedFileKey` 只属于 `PdfImportItem`，不得进入普通资料响应或 `ProductDocument`。
- JSON metadata 迁移后保留为只读备份，不立即删除。
- V3.15 先迁移测试库，不直接迁移真实客户数据。
- 迁移前必须先做 dry-run、计数对照和 checksum 对照。
- 删除锁迁移只迁移 bcrypt hash，不迁移任何明文密码。
