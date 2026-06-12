# 数据模型规划

Prisma schema 位于 `apps/api/prisma/schema.prisma`。当前只做结构规划和校验，不执行真实迁移，不连接真实数据库。

## 核心模型

- `User`：用户、角色、班组。
- `Customer`：客户主数据。
- `Product`：产品主数据、客户关系、当前版本。
- `ProductionPlan`：生产计划、数量、状态、确认状态、readiness。
- `ProductDocument`：产品资料文件元数据。
- `FrontProcessParameter`：前段参数。
- `BackProcessPackage`：后段资料包。
- `QueryLog`：查询留痕。
- `ConfirmationRecord`：组长确认记录。
- `FeedbackRecord`：异常反馈记录。
- `AuditLog`：资料上传、状态变更、版本变更、设为有效、归档、预览、迁移预览等审计记录。

## ProductDocument V0.6 字段

V0.6 对 `ProductDocument` 补充了版本管理和文件元数据字段：

- `versionGroupKey`：可选，同组版本标识。
- `archived`：是否归档，默认 `false`。
- `archivedAt`：归档时间。
- `archivedBy`：归档人。
- `originalFileName`：用户上传时的原始文件名。
- `storedFileName`：后端生成的安全存储文件名。
- `mimeType`：文件 MIME 类型。
- `fileSize`：文件大小。
- `previewType`：预览类型。
- `previewUrl`：预览地址。
- `downloadUrl`：下载地址。
- `remark`：备注。

唯一约束调整为：

```text
productId + documentType + requiredForProcess + version
```

## 版本状态规则

- `EFFECTIVE`：当前有效。
- `PENDING_REVIEW`：待确认。
- `EXPIRED`：已失效或历史版本。
- `MISSING`：缺失。
- `INCONSISTENT`：不一致。

业务分组规则：

```text
productId + documentType + requiredForProcess
```

每组最多只有一个当前有效版本。设置某资料为当前有效时，同组其他有效版本应自动失效。

## AuditLog

字段包括：

- `id`
- `entityType`
- `entityId`
- `action`
- `beforeJson`
- `afterJson`
- `message`
- `operatorId`
- `operatorName`
- `operatorRole`
- `planId`
- `productId`
- `createdAt`

枚举：

- `AuditEntityType`：`DOCUMENT`、`PLAN`、`FEEDBACK`、`FILE`、`SYSTEM`
- `AuditAction`：`DOCUMENT_UPLOADED`、`DOCUMENT_STATUS_CHANGED`、`DOCUMENT_VERSION_CHANGED`、`DOCUMENT_SET_EFFECTIVE`、`DOCUMENT_ARCHIVED`、`DOCUMENT_PREVIEWED`、`DOCUMENT_DOWNLOADED`、`READINESS_RECALCULATED`、`MIGRATION_PREVIEW_GENERATED`

## 后续 Sealos 迁移建议

- 迁移 `ProductDocument` 元数据和 `AuditLog`，不建议把 PDF/图片二进制写入 PostgreSQL。
- 文件本体后续应迁移到对象存储、企业微信微盘同步源或专用文件服务。
- 生产库迁移前必须先在测试库验证，并准备备份和回滚方案。
# V0.7 Prisma Repository 与 Seed 映射说明

Prisma schema 仍是后续 Sealos PostgreSQL 的目标结构，V0.7 不执行迁移。

## Repository 草案

已补充以下 Prisma Repository 实现草案：

- `PrismaProductionPlanRepository`
- `PrismaProductRepository`
- `PrismaDocumentRepository`
- `PrismaSearchRepository`
- `PrismaFeedbackRepository`
- `PrismaAuditRepository`
- `PrismaMigrationRepository`

这些 repository 默认不会被使用，除非 `DATA_SOURCE=prisma`。即使切换到 Prisma，也必须通过数据库安全闸门后才允许读取或写入。

## Seed 映射

V0.7 新增 `apps/api/src/migration/mappers`，把 Mock 数据转换为 Prisma create/upsert 可用的数据结构草案：

- Customer
- Product
- ProductionPlan
- ProductDocument
- FrontProcessParameter
- BackProcessPackage
- FeedbackRecord
- ConfirmationRecord
- AuditLog

## 校验重点

dry-run 校验会检查：

- 产品引用的客户是否存在。
- 生产计划引用的产品是否存在。
- 前段参数/后段资料引用的产品是否存在。
- 资料 metadata 是否带有有效 `productId`。
- 反馈/确认记录引用的计划是否存在。

## 后续接真实库

后续接 Sealos 测试库时，优先替换 repository 数据来源，不改前端接口形状。确认 dry-run 无错误后，再考虑测试库 seed 和迁移策略。
