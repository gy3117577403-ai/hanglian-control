# agent-x-files-upload-mvp

## 任务范围

- 基于默认分支 `main` 创建独立 worktree/branch：`agent-b-files`。
- 只处理后端 files/storage/documents upload 相关逻辑。
- 不处理 PDF 转图片预览。
- 不删除现有功能。

## 已完成

- 审计当前上传链路：原实现只支持本地 `LocalStorageService`，下载/预览通过 `/api/files/:storedFileName` 直接按存储文件名读取。
- 新增统一 `StorageService`：
  - `saveFile`
  - `getFileStream`
  - `deleteFile`
- 上传支持：
  - PDF
  - JPG/JPEG
  - PNG
  - WEBP
- 文件大小限制：
  - PDF：80MB
  - 图片：20MB
- 存储策略：
  - S3 环境变量完整时优先使用 S3。
  - S3 配置缺失时 fallback 到本地持久化目录 `storage/uploads`。
- 下载/读取改为后端文档接口：
  - `POST /api/documents/upload`
  - `GET /api/documents/:id/download`
  - `GET /api/documents/:id/file`
- 不再返回公开裸文件链接；返回的 `previewUrl/downloadUrl` 均为 documentId 后端接口。
- 旧 `/api/files/:...` 调整为按 `documentId` 代理文档文件读取，不再按 `storedFileName` 读取。
- 上传文档记录写入文件元数据：
  - `documentId`
  - `storedFileName`
  - `storageProvider`
  - `storageKey`
  - `checksum`
  - `mimeType`
  - `fileSize`

## 主要改动文件

- `apps/api/src/storage/storage.service.ts`
- `apps/api/src/storage/storage.types.ts`
- `apps/api/src/storage/storage.module.ts`
- `apps/api/src/documents/documents.service.ts`
- `apps/api/src/documents/documents.controller.ts`
- `apps/api/src/documents/document-file-access.guard.ts`
- `apps/api/src/files/files.service.ts`
- `apps/api/src/files/files.controller.ts`
- `apps/api/src/files/files.module.ts`
- `apps/api/src/common/types/production.types.ts`
- `apps/api/src/repositories/mock/mock-document.repository.ts`
- `apps/api/src/repositories/prisma/prisma-document.repository.ts`
- `apps/api/src/repositories/prisma/prisma-mappers.ts`

## 验证结果

- `npm run build -w api`：通过。
- PDF 上传 smoke test：通过，返回 `documentId`。
- PNG 上传 smoke test：通过，返回 `documentId`。
- PDF download：下载原文件，SHA256 哈希一致。
- PNG download：下载原文件，SHA256 哈希一致。
- 临时 API、临时上传文件、测试 metadata 已清理。

## curl 测试命令

```bash
curl -X POST "http://localhost:3000/api/documents/upload" \
  -F "file=@./sample.pdf;type=application/pdf" \
  -F "productId=PRD-4821A" \
  -F "documentType=drawing_pdf" \
  -F "title=Sample PDF" \
  -F "version=Rev.A" \
  -F "requiredForProcess=common"
```

```bash
curl -X POST "http://localhost:3000/api/documents/upload" \
  -F "file=@./sample.png;type=image/png" \
  -F "productId=PRD-4821A" \
  -F "documentType=sop_image" \
  -F "title=Sample Image" \
  -F "version=Rev.A" \
  -F "requiredForProcess=common"
```

```bash
curl -L -o original-file.pdf "http://localhost:3000/api/documents/${DOC_ID}/download"
curl -L -o inline-file.pdf "http://localhost:3000/api/documents/${DOC_ID}/file"
```

如配置 `DOCUMENT_FILE_ACCESS_TOKEN` 或 `FILE_ACCESS_TOKEN`，下载/读取接口需携带：

```bash
curl -H "Authorization: Bearer ${DOCUMENT_FILE_ACCESS_TOKEN}" \
  -L -o original-file.pdf \
  "http://localhost:3000/api/documents/${DOC_ID}/download"
```

## 审查提示

- 重点审查文件类型检测、大小限制、S3 SigV4 最小实现、本地路径安全、旧 `/api/files/:documentId` 兼容策略。
- 当前 Prisma 写入在项目原有 `assertDatabaseWriteAllowed()` 限制下仍受阶段安全开关控制；mock 模式已通过 smoke test。
