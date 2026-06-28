# 文件流设计

## 当前范围

当前系统只做本地原型文件流：平板端选择文件，NestJS Mock API 保存到本机 `apps/api/storage/uploads`，metadata 保存到 `apps/api/storage/metadata/documents.json`。这些本地文件和 metadata 不进入 Git。

## 文件类型

允许上传：

- PDF
- JPG/JPEG
- PNG
- WEBP

单文件推荐不超过 30MB。超出推荐大小会出现预览较慢提醒。

## 预览链路

- PDF 使用 `vue-pdf-embed` 和 `pdfjs-dist`。
- 图片、SOP、孔位图、成品细节图使用 `viewerjs`。
- 文件流通过 `GET /api/files/:storedFileName` 返回。
- 不支持在线预览的文件提示下载查看。

## 文件健康

`GET /api/documents/file-health` 只读检查：

- 文件是否存在。
- 是否仍为演示资料。
- 是否可预览。
- 是否缺失、损坏或不支持。
- 是否为当前有效、历史版本或待确认版本。
- 是否存在重复版本组。
- 是否超过推荐大小。

## 本地脚本

- `npm run demo:assets` 生成安全演示文件。
- `npm run file-flow:check` 检查上传目录、metadata、演示资料声明、大文件、疑似真实资料文件名和 Git 忽略规则。

## 后续接入

后续接企业微信微盘或对象存储时，数据库只保存 metadata、对象 key、微盘文件 ID、MIME、大小、版本和状态。文件本体不进入 Git，也不直接写入 PostgreSQL。

## 安全规则

- 防止路径穿越。
- 不暴露服务器绝对路径。
- 不提交上传文件。
- 不提交 metadata JSON。
- 不提交真实客户资料。
- 不连接 Sealos 测试库或生产库，除非进入单独的数据库验证阶段。
