# API 文档

后端默认地址为 `http://localhost:3000`，全局前缀为 `/api`，Swagger 地址为 `/api/docs`。当前仍是本地 Mock / metadata 演示版，不连接 Sealos PostgreSQL，不执行 migrate、db push、seed 或任何真实写库操作。

## Health

- `GET /api/health`
- `GET /api/system/ping`
- `GET /api/system/data-source`
- `GET /api/system/database-safety`

这些接口只返回服务、环境和安全闸门状态，不主动连接数据库。

## Production Plans

- `GET /api/production-plans?scope=today|week`
- `GET /api/production-plans/:id`
- `GET /api/production-plans/:id/readiness`
- `POST /api/production-plans/:id/confirm`

V2.4 中，计划详情和 readiness 会联动现场知识验证，追加：

- `field_knowledge_validation`
- `field_fixture_ready`
- `field_quality_ready`

如果现场知识验证为 `blocked`，开工检查同步阻塞；如果为 `need_review`，原本 ready 的计划会降级为需复核。

## Documents And Files

- `GET /api/documents`
- `POST /api/documents/upload`
- `GET /api/documents/file-health`
- `GET /api/documents/:id`
- `GET /api/documents/:id/versions`
- `GET /api/documents/versions`
- `PATCH /api/documents/:id/status`
- `PATCH /api/documents/:id/version`
- `POST /api/documents/:id/set-effective`
- `POST /api/documents/:id/archive`
- `POST /api/documents/compare`
- `GET /api/files/:storedFileName`

文件仍保存在本地开发目录，真实客户资料和本地上传文件不提交 Git。

## Search

- `GET /api/search?q=关键词&planId=可选`

搜索结果包含计划、资料、文件、治具、异常案例和质量标准等 Mock 结果。

## Feedback

- `POST /api/feedback`
- `GET /api/feedback?planId=可选`

异常反馈仍写入内存或本地 Mock 数据，不连接真实数据库。

## Imports

- `GET /api/imports/templates`
- `GET /api/imports/templates/:type/download`
- `POST /api/imports/:type/preview`
- `POST /api/imports/:type/apply`
- `GET /api/imports/history`
- `GET /api/imports/history/:id`
- `POST /api/imports/history/:id/rollback-preview`

支持导入类型：

- `production_plan`
- `customer_product`
- `front_parameter`
- `back_package`
- `fixture`
- `abnormal_case`
- `quality_standard`

预览接口只解析和校验，应用接口只写本地 Mock / metadata。

## Maintenance

- `GET /api/maintenance/summary`
- `GET /api/maintenance/customers`
- `GET /api/maintenance/products`
- `GET /api/maintenance/production-plans`
- `GET /api/maintenance/front-parameters`
- `GET /api/maintenance/back-packages`
- `GET /api/maintenance/documents`
- `PATCH /api/maintenance/customers/:id`
- `PATCH /api/maintenance/products/:id`
- `PATCH /api/maintenance/production-plans/:id`
- `PATCH /api/maintenance/front-parameters/:id`
- `PATCH /api/maintenance/back-packages/:id`
- `PATCH /api/maintenance/documents/:id`
- `POST /api/maintenance/documents/:id/set-effective`
- `POST /api/maintenance/bulk-status`
- `GET /api/maintenance/review-queue`
- `POST /api/maintenance/review-queue/:id/resolve`
- `GET /api/maintenance/history`
- `GET /api/maintenance/history/:id`

V2.4 复核队列会追加现场知识库阻塞和待复核问题。

## Auth / Mock RBAC

- `GET /api/auth/mock-users`
- `POST /api/auth/mock-login`
- `GET /api/auth/me`

当前只提供本地 Mock 角色，不接企业微信登录，不保存真实账号。

## Knowledge

V2.4 知识库仍使用 Mock seed 与本地 metadata。

### 治具库

- `GET /api/knowledge/fixtures`
- `POST /api/knowledge/fixtures`
- `PATCH /api/knowledge/fixtures/:id`
- `PATCH /api/knowledge/fixtures/:id/status`
- `POST /api/knowledge/fixtures/bulk-update`

### 异常库

- `GET /api/knowledge/abnormal-cases`
- `POST /api/knowledge/abnormal-cases`
- `PATCH /api/knowledge/abnormal-cases/:id`
- `PATCH /api/knowledge/abnormal-cases/:id/status`
- `POST /api/knowledge/abnormal-cases/bulk-update`

### 质量标准库

- `GET /api/knowledge/quality-standards`
- `POST /api/knowledge/quality-standards`
- `PATCH /api/knowledge/quality-standards/:id`
- `PATCH /api/knowledge/quality-standards/:id/status`
- `POST /api/knowledge/quality-standards/bulk-update`

### 计划 / 产品关联

- `GET /api/knowledge/product/:productId/summary`
- `GET /api/knowledge/product/:productId/validation`
- `GET /api/knowledge/plan/:planId/summary`
- `GET /api/knowledge/plan/:planId/validation`
- `GET /api/knowledge/plan/:planId/recommendations`
- `GET /api/knowledge/search?q=关键词&planId=可选&productId=可选`
- `GET /api/knowledge/history`

## V2.4 Knowledge Field Validation API

### `GET /api/knowledge/plan/:planId/validation`

按生产计划返回现场知识验证结果，包含计划与产品信息、验证状态、验证分数、治具汇总、异常汇总、质量标准汇总、检查项列表和推荐处理动作。

### `GET /api/knowledge/product/:productId/validation`

按产品返回现场知识验证结果。可选查询参数：`processSegment=front|back|common`。

### `GET /api/knowledge/plan/:planId/recommendations`

返回当前计划的现场知识推荐动作，用于班前走查、开工提醒和复核队列联动。

### `POST /api/knowledge/fixtures/bulk-update`

批量维护治具库记录。请求体包含 `ids`、`patch`、`reason`、`operatorId`、`operatorName`、`operatorRole`。

### `POST /api/knowledge/abnormal-cases/bulk-update`

批量维护异常库记录，允许维护状态、工序、严重度、关键词、备注等白名单字段。

### `POST /api/knowledge/quality-standards/bulk-update`

批量维护质量标准库记录，允许维护状态、工序、缺陷等级、关键词、备注等白名单字段。

## Safety

- 不提交 `.env.local`。
- 不提交真实客户资料。
- 不提交本地上传文件。
- 不提交 metadata JSON。
- 不写入真实 DATABASE_URL。
- 不连接 Sealos PostgreSQL。
- 不接企业微信微盘。
- 不接真实语音识别。

## V2.5 Production Execution API

当前执行闭环 API 使用本地 Mock / metadata，不连接数据库，不执行写库操作。

- `GET /api/execution/summary`：返回生产执行总览。
- `GET /api/execution/plans`：返回执行计划列表。
- `GET /api/execution/plans/:planId`：返回单个计划执行详情。
- `POST /api/execution/plans/:planId/prepare-start`：生成开工检查结果。
- `POST /api/execution/plans/:planId/start`：模拟开始生产。
- `POST /api/execution/plans/:planId/process-confirm`：提交首件、巡检、资料复核或异常确认。
- `POST /api/execution/plans/:planId/quantity-report`：提交数量报工。
- `POST /api/execution/plans/:planId/pause`：暂停生产。
- `POST /api/execution/plans/:planId/resume`：恢复生产。
- `POST /api/execution/plans/:planId/exception-hold`：异常停线。
- `POST /api/execution/plans/:planId/complete`：完工确认。
- `GET /api/execution/plans/:planId/timeline`：返回执行时间线。
- `POST /api/execution/shift-handover`：提交班组交接。
- `GET /api/execution/shift-handover`：查询班组交接记录。
- `GET /api/execution/daily-report`：返回现场日报结构化数据。
- `GET /api/execution/daily-report/text`：返回现场日报文本。
