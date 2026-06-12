# API 文档

后端默认地址 `http://localhost:3000`，全局前缀 `/api`，Swagger 地址 `/api/docs`。V1.5 支持局域网演示：API 可通过 `HOST=0.0.0.0` 监听，平板可访问 `http://<电脑IPv4>:3000/api`。当前默认仍为 Mock / 本地文件原型，不连接 Sealos PostgreSQL。

## Health

### `GET /api/health`

返回服务状态、版本和数据源。

## System

### `GET /api/system/ping`

轻量延迟检测接口，不连接数据库。

响应示例：

```json
{
  "ok": true,
  "timestamp": "2026-06-13T08:00:00.000Z",
  "service": "线束车间生产计划资料管控系统 API"
}
```

### `GET /api/system/data-source`

返回当前数据源、安全闸门和数据库配置状态。V1.5 网络诊断面板只读取该状态，不执行数据库连接。

### `GET /api/system/database-safety`

返回数据库安全闸门状态，只用于展示和检查。

## Production Plans

- `GET /api/production-plans?scope=today|week`
- `GET /api/production-plans/:id`
- `GET /api/production-plans/:id/readiness`
- `POST /api/production-plans/:id/confirm`

## Documents

### `GET /api/documents`

按 `planId`、`productId`、`documentType`、`status` 查询 Mock 和本地上传资料。

### `POST /api/documents/upload`

上传本地 PDF/JPG/PNG/WEBP 并绑定到当前产品资料包。后端校验 MIME、扩展名、30MB 限制、安全文件名和路径穿越风险。

成功返回 `ProductDocument`，可能包含：

- `duplicateVersionWarning`
- `recommendedAction`

### `GET /api/documents/file-health`

只读检查文件健康。

返回摘要新增：

- `effectiveUploadedDocuments`
- `pendingReviewDocuments`
- `expiredDocuments`
- `unsupportedDocuments`
- `largeFileWarnings`
- `duplicateVersionGroups`

单项新增：

- `versionGroupKey`
- `isEffective`
- `isHistorical`
- `isPendingReview`
- `largeFileWarning`
- `duplicateVersionWarning`
- `recommendedAction`

### `POST /api/documents/:id/set-effective`

设置某个资料版本为当前有效。同组其他有效版本会转为失效。

### 其他资料接口

- `GET /api/documents/:id`
- `GET /api/documents/:id/versions`
- `GET /api/documents/versions`
- `PATCH /api/documents/:id/status`
- `PATCH /api/documents/:id/version`
- `POST /api/documents/:id/archive`
- `POST /api/documents/compare`

## Files

### `GET /api/files/:storedFileName`

返回本地上传文件流。接口防止路径穿越，不返回服务器绝对路径，缺失文件返回中文 404。

V1.5 网络诊断面板会展示 `/api/files/<storedFileName>` 的用途说明；只有手工上传资料生成了 `storedFileName` 后，该文件流接口才会返回真实本地文件。

## Search

### `GET /api/search?q=关键词&planId=可选`

搜索计划、前段参数、后段资料、图纸、SOP、连接器、孔位图和成品细节图。

## Feedback

- `POST /api/feedback`
- `GET /api/feedback?planId=可选`

## Audit

### `GET /api/audit-logs`

查询本地审计记录。

## Safety

当前阶段禁止执行数据库连接、migrate、db push、seed 和真实企业微信微盘连接。
