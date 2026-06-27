# Agent X 任务报告

## 状态

- 状态：完成
- 任务：资料文件上传、保存、下载后端 MVP
- 范围：仅修改 files/storage/documents upload 相关后端文件；未处理 PDF 转图片预览
- 工作目录：`C:\Users\31175\Desktop\hanglian-agent-b-files`

## 分支

- 分支：`agent-b-files`
- 来源：默认分支 `main`
- 未直接修改：`main` / `master`

## commit

- 当前 HEAD：`8d7e693`
- 本任务尚未创建提交，当前变更仍在工作区中。

## 修改文件

- `apps/api/src/common/types/production.types.ts`
- `apps/api/src/documents/documents.controller.ts`
- `apps/api/src/documents/documents.module.ts`
- `apps/api/src/documents/documents.service.ts`
- `apps/api/src/documents/document-file-access.guard.ts`
- `apps/api/src/files/files.controller.ts`
- `apps/api/src/files/files.module.ts`
- `apps/api/src/files/files.service.ts`
- `apps/api/src/repositories/mock/mock-document.repository.ts`
- `apps/api/src/repositories/prisma/prisma-document.repository.ts`
- `apps/api/src/repositories/prisma/prisma-mappers.ts`
- `apps/api/src/storage/storage.module.ts`
- `apps/api/src/storage/storage.service.ts`
- `apps/api/src/storage/storage.types.ts`
- `reports/agent-x-files-upload-mvp.md`
- `reports/agent-x.md`

## 新增接口

- `POST /api/documents/upload`
  - 支持 PDF、JPG/JPEG、PNG、WEBP。
  - PDF 最大 80MB。
  - 图片最大 20MB。
  - 返回文档记录，包含 `documentId`。
- `GET /api/documents/:id/download`
  - 通过 documentId 下载原文件。
  - 文件不使用公开裸链。
- `GET /api/documents/:id/file`
  - 通过 documentId 读取原文件流。
  - 用于后端受控读取/预览入口，不做 PDF 转图片预览。
- 兼容调整：`GET /api/files/:documentId`
  - 旧 files 路由不再按 `storedFileName` 直读文件，改为按 documentId 代理读取。

## 数据库变化

- 未新增 Prisma schema/migration。
- 沿用现有 `ProductDocument`/documents 记录。
- 上传时写入/返回文件元数据：
  - `documentId`
  - `storedFileName`
  - `storageProvider`
  - `storageKey`
  - `checksum`
  - `mimeType`
  - `fileSize`
  - `previewUrl`
  - `downloadUrl`
- Mock repository 会写入本地 metadata JSON。
- Prisma repository 已补齐 `storageProvider/storageKey/checksum` 写入和 mapper 读取；但当前项目阶段仍受原有 `assertDatabaseWriteAllowed()` 保护。

## 环境变量

- 通用：
  - `API_PREFIX`
  - `DATA_SOURCE`
  - `DOCUMENT_FILE_ACCESS_TOKEN`
  - `FILE_ACCESS_TOKEN`
- S3 优先配置：
  - `S3_BUCKET` 或 `AWS_S3_BUCKET`
  - `S3_REGION` 或 `AWS_REGION`
  - `S3_ENDPOINT` 或 `AWS_S3_ENDPOINT`
  - `S3_ACCESS_KEY_ID` 或 `AWS_ACCESS_KEY_ID`
  - `S3_SECRET_ACCESS_KEY` 或 `AWS_SECRET_ACCESS_KEY`
  - `S3_SESSION_TOKEN` 或 `AWS_SESSION_TOKEN`
  - `S3_FORCE_PATH_STYLE`
  - `S3_OBJECT_PREFIX` 或 `S3_PREFIX`
- fallback：S3 必要配置缺失时自动使用本地 `storage/uploads`。

## 测试命令

- 安装依赖：
  - `npm ci --ignore-scripts`
- 后端构建：
  - `npm run build -w api`
- 本地 smoke test：
  - 启动 `apps/api/dist/src/main.js`，设置 `PORT=3100`、`API_PREFIX=api`、`DATA_SOURCE=mock`
  - 使用 curl 上传最小 PDF
  - 使用 curl 上传最小 PNG
  - 使用 `GET /api/documents/:id/download` 下载文件
  - 使用 SHA256 比对上传文件和下载文件

## 测试结果

- `npm run build -w api`：通过。
- PDF 上传：通过，返回 `documentId`。
- PNG 上传：通过，返回 `documentId`。
- PDF 下载：通过，下载原文件 SHA256 一致。
- PNG 下载：通过，下载原文件 SHA256 一致。
- 测试产生的临时 API 进程、临时文件、测试 metadata 已清理。

## 阻塞问题

- 无实现阻塞。
- S3 代码路径已实现但未做真实 S3 联通测试，因为当前环境未提供 S3 凭据。
- Prisma 写入路径在项目当前阶段仍被原有数据库安全开关阻止，mock 模式已验证。

## 集成建议

- 在联调/生产环境配置 `DOCUMENT_FILE_ACCESS_TOKEN` 或接入正式鉴权 guard。
- 将 S3 环境变量补充到部署环境模板或密钥配置中。
- 使用真实对象存储做一次上传/下载/删除 smoke test。
- 前端统一使用文档记录中的 `previewUrl/downloadUrl`，不要拼接 `/api/files/:storedFileName`。
- 数据库写入阶段开放后，再对 Prisma repository 做 e2e 上传验证。
- 后续可补充自动化 e2e：PDF 上传、图片上传、超限拒绝、非法类型拒绝、download hash 比对。
