# 文件流设计

## V1.3 当前文件流

当前系统只做本地原型文件流，不接真实企业微信微盘、对象存储或 Sealos 数据库。

1. 组长在平板端上传 PDF/JPG/PNG/WEBP 文件。
2. 后端将文件保存到 `apps/api/storage/uploads`。
3. 后端将资料 metadata 保存到 `apps/api/storage/metadata/documents.json`。
4. 文件预览和下载通过 `/api/files/:storedFileName` 读取本地文件流。
5. 前端 PDF 资料使用 `vue-pdf-embed` 与 `pdfjs-dist` 预览。
6. 前端图片类资料使用 `viewerjs` 放大查看。
7. `/api/documents/file-health` 只读检查 metadata 与本地文件状态。

## 企业微信微盘接入规划

后续接企业微信微盘时，不改变前端 `ProductDocument` 主结构：

- 微盘文件 ID 保存为资料 metadata 字段。
- 后端定时或手动同步文件标题、版本、大小、更新时间、来源。
- 文件需要预览时，后端按权限下载或缓存，再生成内部 `previewUrl` / `downloadUrl`。
- `source` 使用 `wecom_disk`。
- 文件健康检查扩展为检查微盘文件 ID、缓存状态和预览链接有效性。

## 对象存储接入规划

后续接对象存储时：

- 文件本体进入对象存储，不进入 Git。
- 数据库只保存文件 metadata、对象 key、MIME、大小、hash、版本和状态。
- 下载与预览使用后端签发的 signed URL 或内部代理 URL。
- 图片类资料可生成缩略图。
- 权限控制在后端统一判断，不在前端暴露真实内部路径。

## Sealos PostgreSQL 接入规划

后续接 Sealos PostgreSQL 时：

- PostgreSQL 只保存文件 metadata，不保存 PDF/图片二进制。
- `ProductDocument` 表保存文件标题、版本、状态、来源、MIME、大小、对象 key 或微盘文件 ID。
- `AuditLog` 保存上传、预览、下载、设为有效、归档等操作。
- 文件健康检查服务替换 metadata 读取来源，但保持 API 返回结构兼容。

## 文件健康状态

- `ok`：可预览，文件存在且预览类型受支持。
- `demo`：演示资料，来自 Mock 数据或未绑定真实文件。
- `missing_file`：metadata 存在，但本地文件缺失。
- `broken`：文件存在，但预览地址或预览类型异常。
- `unsupported`：MIME 类型不支持当前预览。

## 安全规则

- 防止路径穿越，只允许读取安全文件名。
- 限制 MIME 类型：PDF、JPG、PNG、WEBP。
- 限制单文件大小，当前原型为 30MB。
- 不提交真实资料到 Git。
- 不提交 `storage/uploads` 真实文件。
- 不提交 `storage/metadata/*.json`。
- 前端不暴露真实服务器内部路径。
