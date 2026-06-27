# Agent X 报告

## 状态

已完成。PDF 转图片预览后端 MVP 已在独立 worktree/branch 中实现，并完成本地构建与接口烟测。

## 分支

- 分支：`agent-c-pdf-preview`
- Worktree：`C:\Users\31175\Desktop\hanglian-agent-c-pdf-preview`
- 基线：`origin/main`

## Commit

- 当前 HEAD：`8d7e693`
- 状态：改动尚未提交，工作区存在本任务相关未提交文件。

## 修改文件

代码文件：

- `apps/api/src/documents/documents.controller.ts`
- `apps/api/src/documents/documents.module.ts`
- `apps/api/src/documents/documents.service.ts`
- `apps/api/src/documents/pdf-preview.service.ts`
- `apps/api/src/documents/pdf-preview.worker.ts`

报告文件：

- `reports/agent-c-pdf-preview.md`
- `reports/agent-x.md`

## 新增接口

- `GET /api/documents/:id/preview`
  - 返回 `documentId`、`title`、`fileType`、`pageCount`、`previewStatus`、`pages`。
  - `previewStatus` 支持 `pending`、`ready`、`failed`。
  - `pages` 中包含 `pageNo`、`imageUrl`、`width`、`height`。

- `GET /api/documents/:id/preview-pages/:pageNo`
  - 返回指定页图片流。
  - PDF 页面返回 PNG。
  - 图片资料第 1 页直接返回原图片流。

## 数据库变化

无 Prisma schema 或数据库迁移变化。

MVP 使用文件 manifest 作为 `document_preview_pages` 等价结构：

- 路径：`apps/api/storage/uploads/_previews/<documentId>/manifest.json`
- 页面图片：`apps/api/storage/uploads/_previews/<documentId>/page-0001.png` 等
- manifest 记录页码、文件名、宽高、状态、源文件名。

## 环境变量

- `PDFTOPPM_PATH`：可选，指定 `pdftoppm` 可执行文件路径。
- `PDF_PREVIEW_DENSITY`：可选，默认 `144`，PDF 转图片 DPI。
- `PDF_PREVIEW_TIMEOUT_MS`：可选，默认 `120000`，PDF 转换超时。
- `PDF_PREVIEW_SYNC_WAIT_MS`：可选，默认 `8000`，preview 接口等待同步转换的时间。
- `API_PREFIX`：沿用现有配置，默认 `api`。
- 本地烟测使用：`PORT=3017`、`DATA_SOURCE=mock`。

## 测试命令

- `npm ci`
- `npm run build -w api`
- 本地启动 API：
  - `PORT=3017`
  - `DATA_SOURCE=mock`
  - `PDFTOPPM_PATH=<local pdftoppm.exe>`
  - `npm run start -w api`
- HTTP 烟测：
  - 上传 PDF 到 `POST /api/documents/upload`
  - 请求 `GET /api/documents/<documentId>/preview`
  - 请求 `GET /api/documents/<documentId>/preview-pages/1`
  - 上传 PNG 图片后重复 preview 与 page 请求

## 测试结果

- `npm run build -w api`：通过。
- PDF 上传烟测：通过。
  - `previewStatus=ready`
  - `pageCount=1`
  - 第 1 页 URL 返回 `200 OK`
  - `Content-Type=image/png`
- 图片上传烟测：通过。
  - `previewStatus=ready`
  - `pageCount=1`
  - `preview-pages/1` 返回 `200 OK image/png`

## 阻塞问题

无当前代码阻塞。

注意事项：

- Sealos Linux 容器必须安装 Poppler `poppler-utils`，否则 PDF 转换会返回 `failed`。
- Windows 本地若 `pdftoppm` 不在 PATH，需要设置 `PDFTOPPM_PATH`。

## 集成建议

- ArkTS 端调用 `GET /api/documents/:id/preview`，仅使用 `pages[].imageUrl` 渲染滚动图片列表。
- ArkTS 不需要 PDF 插件、PDF.js 或浏览器 PDF 能力。
- Sealos 部署时建议持久化挂载 `apps/api/storage`，保留上传文件与 `_previews` 页面图片。
- 后续如需要严格数据库化，可将 manifest 迁移为正式 `document_preview_pages` 表，字段可复用 `documentId/pageNo/imageUrl/width/height/status`。
