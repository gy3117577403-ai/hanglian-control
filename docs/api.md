# V0.6 Mock API

后端默认地址 `http://localhost:3000`，全局前缀 `/api`，Swagger 地址 `/api/docs`。当前默认数据源仍为 `DATA_SOURCE=mock`。

## 健康检查

### `GET /api/health`

```json
{
  "status": "ok",
  "service": "线束车间生产计划资料管控系统 API",
  "version": "0.6.0",
  "dataSource": "mock"
}
```

### `GET /api/system/data-source`

返回当前数据源状态，不连接真实数据库。

## 生产计划

- `GET /api/production-plans?scope=today|week`
- `GET /api/production-plans/:id`
- `GET /api/production-plans/:id/readiness`
- `POST /api/production-plans/:id/confirm`

V0.6 会在资料状态或有效版本变化后，通过刷新计划详情重新得到最新 readiness。

## 资料文件

### `GET /api/documents`

查询 seed Mock 资料和本地上传资料。

可选参数：`planId`、`productId`、`documentType`、`status`。

### `POST /api/documents/upload`

上传本地 PDF/JPG/PNG/WEBP 文件并绑定产品或计划。成功后写入 `document_uploaded` 审计记录。

### `GET /api/documents/:id`

获取单个资料详情。

### `PATCH /api/documents/:id/status`

更新资料状态。成功后写入 `document_status_changed` 审计记录。

```json
{
  "status": "pending_review",
  "reason": "现场要求复核"
}
```

### `PATCH /api/documents/:id/version`

更新资料版本号。成功后写入 `document_version_changed` 审计记录。

```json
{
  "version": "Rev.C",
  "status": "pending_review"
}
```

### `POST /api/documents/:id/archive`

归档资料，不物理删除文件。成功后写入 `document_archived` 审计记录。

### `GET /api/documents/:id/versions`

返回当前资料所属版本分组。

分组规则：

```text
productId + documentType + requiredForProcess
```

返回字段包括：

- `currentDocument`
- `versions`
- `effectiveDocumentId`
- `versionCount`
- `hasExpired`
- `hasPendingReview`
- `hasInconsistent`

### `GET /api/documents/versions`

查询某产品的资料版本分组列表。

参数：

- `productId` 必填
- `documentType` 可选
- `requiredForProcess` 可选

### `POST /api/documents/:id/set-effective`

将某个资料设为当前有效版本。同组其他 `effective` 自动改为 `expired`。

```json
{
  "reason": "确认 Rev.C 为当前有效版本",
  "operatorId": "demo-leader",
  "operatorName": "组长演示账号",
  "operatorRole": "组长"
}
```

返回：

- `document`
- `versions`
- `readiness`

### `POST /api/documents/compare`

只对比资料元数据，不比较 PDF 或图片内容。

```json
{
  "documentIds": ["doc-001", "doc-002"]
}
```

对比字段包括标题、资料类型、版本、状态、来源、适用工序、原始文件名、文件大小、生效日期、更新时间、关键词和备注。

## 文件流

### `GET /api/files/:storedFileName`

读取 `apps/api/storage/uploads` 内的本地文件流。会尝试写入 `document_previewed` 审计记录，但审计失败不会影响文件返回。

## 搜索

### `GET /api/search?q=关键词&planId=可选`

搜索结果中的资料类结果新增：

- `version`
- `status`
- `source`
- `isEffective`
- `isHistorical`
- `versionGroupKey`
- `scope`

关键词覆盖版本号、当前有效、待确认、已失效、历史版本、文件标题、关键词和原始文件名。

## 审计

### `GET /api/audit-logs`

查询本地审计记录，按 `createdAt` 倒序。

参数：

- `entityType`
- `entityId`
- `planId`
- `productId`
- `action`
- `limit`，默认 50

## 迁移

### `GET /api/migration/preview`

返回本地 Mock/metadata 迁移到 Prisma PostgreSQL 的预览统计，不连接数据库。

### `GET /api/migration/export-seed`

返回后续 Prisma seed 可用的 JSON 结构，不写数据库，不连接数据库，不包含真实密钥。

包含 `customers`、`products`、`productionPlans`、`documents`、`frontParameters`、`backPackages`、`feedbackRecords`、`confirmationRecords`、`auditLogs`。

## 当前限制

- 不连接真实 Sealos PostgreSQL。
- 不执行 `prisma migrate`、`prisma db push`、真实 seed。
- 不连接企业微信微盘。
- 不接真实语音识别。
- 文件本体仍在本地 `storage/uploads`。
# V0.7 Mock 迁移与数据库安全接口

## System

### GET `/api/system/database-safety`

V0.8A 返回数据库安全闸门状态。该接口不会连接数据库。

新增/重点字段：

- `dataSource`：当前业务数据源，默认 `mock`。
- `dbTarget`：数据库目标，只有测试库只读验证时应为 `test`。
- `databaseConfigured`：是否配置了非示例 `DATABASE_URL`。
- `databaseUrlMasked`：脱敏连接串，只显示 host、port、database 和脱敏 username。
- `databaseUrlLooksExample`：连接串是否仍为示例值。
- `databaseUrlLooksProduction`：连接串是否包含 `prod`、`production`、`生产`、`正式` 等高风险关键词。
- `envLocalExists`：是否检测到 `apps/api/.env.local`。
- `allowTestDbConnect`：是否允许测试库只读连接检查。
- `allowPrismaWrite`：是否允许 Prisma 写入，V0.8A 应保持 `false`。
- `allowDestructiveDbActions`：是否允许危险操作，V0.8A 应保持 `false`。
- `canReadDatabase`：是否满足 Sealos 测试库只读验证条件。
- `canWriteDatabase`：V0.8A 固定为 `false`。
- `destructiveActionsAllowed`：V0.8A 固定为 `false`。
- `stage`：`V0.8A_READONLY_CHECK`。
- `warnings`：中文安全提醒。
- `nextSteps`：下一步建议。

### GET `/api/system/data-source`

返回当前数据源和 Prisma 接入准备状态。

关键字段：

- `dataSource`：`mock` 或 `prisma`
- `databaseConfigured`：`DATABASE_URL` 是否已配置且不是示例值
- `dbTarget`：当前数据库目标，例如 `local`、`test`
- `allowTestDbConnect`：是否允许测试库连接
- `allowPrismaWrite`：是否允许 Prisma 写入
- `allowDestructiveDbActions`：是否允许危险数据库操作
- `prismaAvailable`：当前是否满足 Prisma 读取条件

### GET `/api/system/database-safety`

返回数据库安全闸门完整状态，包含：

- `canReadDatabase`
- `canWriteDatabase`
- `destructiveActionsAllowed`
- `warnings`
- `nextSteps`
- `message`

默认状态下 `canReadDatabase=false`、`canWriteDatabase=false`。

## Migration

### GET `/api/migration/validate`

校验当前 Mock seed、本地上传资料 metadata、审计 metadata 是否可转换为 Prisma seed 结构。

不会连接数据库，不会写入数据库。

### GET `/api/migration/prisma-seed-preview`

生成 Prisma seed dry-run JSON 结构预览，包含：

- `summary`
- `errors`
- `warnings`
- `safety`
- `seed`

该接口只返回预览数据，不执行真实 seed。

### GET `/api/migration/preview`

保留 V0.6 迁移统计预览。V0.7 中继续用于前端迁移弹窗概要展示。

### GET `/api/migration/export-seed`

导出 Mock seed JSON 预览，不写入数据库。
# V1.3 新增：文件健康检查

## GET /api/documents/file-health

用途：只读检查当前资料文件是否可预览、是否仍为演示资料、是否缺失或预览异常。

Query：

- `planId`：可选，按计划过滤。
- `productId`：可选，按产品过滤。

响应示例：

```json
{
  "scope": {
    "planId": "PLN-20260611-001",
    "productId": "PRD-4821A"
  },
  "summary": {
    "totalDocuments": 12,
    "uploadedDocuments": 4,
    "mockDocuments": 8,
    "previewableDocuments": 4,
    "missingFiles": 0,
    "brokenPreview": 0,
    "demoOnly": 8
  },
  "items": [
    {
      "documentId": "DOC-001",
      "title": "PDF 图纸 Rev.B",
      "documentType": "drawing_pdf",
      "version": "Rev.B",
      "source": "manual_upload",
      "previewType": "pdf",
      "hasStoredFile": true,
      "fileExists": true,
      "canPreview": true,
      "isDemoOnly": false,
      "healthStatus": "ok",
      "message": "文件可预览"
    }
  ]
}
```

状态说明：

- `ok`：文件可预览。
- `demo`：演示资料。
- `missing_file`：文件缺失。
- `unsupported`：不支持预览。
- `broken`：预览异常。

安全边界：该接口不连接数据库、不修改 metadata、不删除文件、不执行迁移或 seed。
