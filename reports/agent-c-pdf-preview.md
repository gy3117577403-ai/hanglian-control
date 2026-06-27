# Agent C PDF Preview 后端 MVP 报告

## 基本信息

- 分支：`agent-c-pdf-preview`
- Worktree：`C:\Users\31175\Desktop\hanglian-agent-c-pdf-preview`
- 基线：`origin/main`
- 范围：仅修改 PDF preview worker/service/controller 相关文件

## 问题原因

当前 PDF 预览失败的核心原因是：上传 PDF 后，后端只把原始 PDF 文件 URL 写入 `previewUrl`，前端通过 iframe 或浏览器 PDF 插件打开原文件。该方案依赖浏览器或平台 PDF 能力，ArkTS 端无法稳定直接预览 PDF。

## 实现内容

- 新增 `PdfPreviewWorker`，通过 Poppler `pdftoppm` 将 PDF 转为 PNG 页面图片。
- 新增 `PdfPreviewService`，负责预览状态、转换触发、manifest 记录、图片页读取和并发转换保护。
- 上传 PDF 后触发后台预热转换；首次调用 preview 时也会按需转换。
- 图片资料不转换，preview 直接返回单页图片。
- 新增接口：
  - `GET /api/documents/:id/preview`
  - `GET /api/documents/:id/preview-pages/:pageNo`
- preview 返回结构包含：
  - `documentId`
  - `title`
  - `fileType`
  - `pageCount`
  - `previewStatus`
  - `pages[{ pageNo, imageUrl, width, height }]`

## 存储方案

- 预览页存储路径：`apps/api/storage/uploads/_previews/<documentId>/`
- 每个文档目录下包含：
  - `manifest.json`
  - `page-0001.png`
  - 后续页图片
- manifest 作为 `document_preview_pages` 的 MVP 等价结构，记录页码、图片文件名、宽高、状态和源文件名。

## 改动文件

- `apps/api/src/documents/documents.controller.ts`
- `apps/api/src/documents/documents.module.ts`
- `apps/api/src/documents/documents.service.ts`
- `apps/api/src/documents/pdf-preview.service.ts`
- `apps/api/src/documents/pdf-preview.worker.ts`

## 验证结果

- `npm run build -w api`：通过
- PDF 上传烟测：
  - preview 返回 `previewStatus=ready`
  - preview 返回 `pageCount=1`
  - 第一页 URL 返回 `200 OK`
  - `Content-Type: image/png`
- 图片上传烟测：
  - preview 返回 `previewStatus=ready`
  - preview 返回 `pageCount=1`
  - `preview-pages/1` 返回原图片流

## 本地测试方法

```powershell
cd C:\Users\31175\Desktop\hanglian-agent-c-pdf-preview
npm ci
$env:PORT='3017'
$env:DATA_SOURCE='mock'
$env:PDFTOPPM_PATH='C:\path\to\pdftoppm.exe'
npm run start -w api
```

```bash
curl http://127.0.0.1:3017/api/documents/<documentId>/preview
curl -o page-1.png http://127.0.0.1:3017/api/documents/<documentId>/preview-pages/1
```

## Sealos 部署依赖

- Linux 容器需要安装 Poppler：

```dockerfile
RUN apt-get update \
  && apt-get install -y --no-install-recommends poppler-utils \
  && rm -rf /var/lib/apt/lists/*
```

- 确保 `pdftoppm` 在 `PATH`，或设置 `PDFTOPPM_PATH=/usr/bin/pdftoppm`。
- 建议持久化挂载 `apps/api/storage`，以保留上传文件和 `_previews` 预览页。

## ArkTS 对接方式

ArkTS 端只需调用 `GET /api/documents/:id/preview` 获取 `pages`，再使用滚动列表渲染每个 `imageUrl`。无需 PDF 插件或 PDF 渲染能力。
