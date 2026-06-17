# 上传沙盒测试指南

本指南用于真实客户资料进入系统前的本地沙盒验证。当前仍然不连接 Sealos，不接企业微信微盘，不接真实语音平台。

## 目标

- 使用合成演示文件验证本地上传、搜索、产品详情合并和预览链路。
- 验证测试结束后，脚本只清理本次创建的测试资料、审计记录和上传文件。
- 避免真实客户资料、真实图纸、真实 SOP、密钥或数据库连接串进入本地测试和 Git。

## 推荐命令

真实资料上传前，优先执行一键预检：

```bash
npm run real-data:preflight
```

该命令会按顺序执行下面的沙盒、交互、安全和构建检查，并生成 `docs/generated/real-data-upload-preflight-report.md`。

如果需要分步排查，可以逐条执行：

```bash
npm run demo:assets
npm run upload-sandbox:check
npm run document-hub-upload:check
npm run tablet-ui-interaction:check
npm run tablet-production:check
npm run performance-budget:check
npm run file-flow:check
```

`npm run demo:assets` 会生成 `demo-upload-assets/` 下的合成 PDF / PNG / TXT 文件。这些文件带有 `DEMO ONLY` 声明，不是真实客户资料，并且已加入 `.gitignore`。

建议按上面的顺序逐条执行，不要把上传沙盒检查、浏览器交互检查和构建命令并行启动，避免多个本地 Mock API 或 Nest build 同时启动时抢占资源。

`npm run upload-sandbox:check` 会验证统一资料中心：

1. 必要时自动启动本地 Mock API：`http://127.0.0.1:3101/api`。
2. 上传 `demo-upload-assets/demo-drawing-rev-a.pdf` 到统一资料中心。
3. 通过统一搜索确认资料可查询。
4. 通过 `previewUrl` 确认本地预览流可读取。
5. 停止脚本启动的本地 API。
6. 只删除本次脚本创建的资料 metadata、审计记录和上传文件。

`npm run document-hub-upload:check` 会验证主页面资料库：

1. 必要时自动启动本地 Mock API：`http://127.0.0.1:3102/api`。
2. 通过 `/api/document-hub/drawings/products/:productId/modules/:moduleKey/upload` 上传演示 PDF。
3. 再次读取产品详情，确认上传资料已经合并到对应图纸模块。
4. 通过 `previewUrl` 确认主页面资料项可真实预览。
5. 停止脚本启动的本地 API。
6. 只删除本次脚本创建的资料 metadata、审计记录和上传文件。

`npm run tablet-ui-interaction:check` 会验证主界面关键交互：

1. 必要时自动启动本地 Mock API 和平板端 dev server。
2. 使用本机 Chrome DevTools 驱动 1366 x 768 平板视口。
3. 验证资料库圆形入口、订单栏折叠/展开、查看全部、大图查看与返回、上传弹窗、订单总览。
4. 验证上传弹窗在未选择文件时禁用确认按钮，并显示“文件检查”摘要。
5. 验证主页面没有横向溢出，并保存回归截图到 `docs/generated/tablet-ui-interaction-1366.png`。
6. 检查过程不连接数据库，不上传真实客户资料，不执行写库操作。

`npm run tablet-production:check` 会验证生产构建预览：

- 使用专用 Mock API 端口构建平板端 dist，并通过 `vite preview` 打开 `/tablet`。
- 使用 1280x800、1366x768、1920x1200 三档横屏平板视口验证无横向溢出、玻璃质感、A4 图纸/SOP 比例和主要按钮可用。
- 使用 Chrome 验证图纸、连接器、治具三个懒加载功能区都能切换。
- 验证图纸“查看全部”、返回、上传弹窗、文件检查摘要和页面横向溢出。
- 保存截图到 `docs/generated/tablet-production-preview-1280.png`、`docs/generated/tablet-production-preview-1366.png` 和 `docs/generated/tablet-production-preview-1920.png`。
- 检查过程不连接数据库，不上传真实客户资料，不执行写库操作。

## 主页面上传保护

真实资料通过主页面上传前，弹窗会先在前端做一次轻量检查：

- 只允许 `PDF / JPG / PNG / WEBP`。
- 单个文件最大 30MB，超过会阻止上传。
- 超过 15MB 会提示大文件预览可能较慢，便于安卓平板重点观察打开速度。
- 选择文件后会显示文件名、类型、大小和本地预览摘要。
- 如果当前产品模块已有相同标题和版本，会提示重复风险，但仍允许作为补充资料上传。
- 已选文件可以在上传前清除，避免误传。
- 真实资料测试上传前必须勾选“本机测试上传，测试完成后会清理资料”的护栏确认；更换文件后需要重新确认。

`npm run performance-budget:check` 会在前端构建后检查平板端 JavaScript chunk 大小：

- 单个 JS chunk 必须低于 500KB，降低安卓平板首屏解析和切换卡顿风险。
- `TabletDashboard` 首屏 chunk 会单独提示，避免主界面重新变重。
- 该检查只读取 `apps/tablet/dist/assets`，不连接数据库，不写入数据。

`npm run file-flow:check` 是只读检查，用来确认：

- 上传目录存在。
- metadata 被 Git 忽略。
- `apps/api/storage/uploads` 中没有遗留非 `.gitkeep` 文件。
- 演示资料存在且带有非真实资料声明。

## 清理策略

两个上传沙盒检查都只清理自己创建的数据，不会清空整个上传目录。

如果需要清理全部本地演示数据，可以先 dry-run：

```bash
npm run demo:clean:dry
```

确认无误后再执行：

```bash
npm run demo:clean
```

`demo:clean` 会备份后清理演示目录、上传文件和本地 metadata。不要在保存了真实客户资料的环境里直接执行。

## 禁止事项

- 不要使用真实客户资料做沙盒检查。
- 不要把真实 `DATABASE_URL`、企业微信 secret、语音平台 key 放进测试文件。
- 不要提交 `apps/api/.env.local`。
- 不要提交 `apps/api/storage/uploads`。
- 不要提交 `apps/api/storage/metadata/*.json` 或 `*.sql`。
- 不要把 `demo-upload-assets/` 里的生成文件提交到 Git。

## 进入真实资料测试前

真实资料测试前至少需要满足：

- `npm run upload-sandbox:check` 通过。
- `npm run document-hub-upload:check` 通过。
- `npm run tablet-ui-interaction:check` 通过。
- `npm run tablet-production:check` 通过，或确认 `npm run real-data:preflight` 中的生产构建预览已通过。
- `npm run file-flow:check` 无阻塞风险。
- `npm run security:check` 通过。
- `npm run build` 通过。
- `npm run check` 通过。
- `npm run performance-budget:check` 通过，或确认 `npm run check` 中的性能预算已通过。
- 或者直接执行 `npm run real-data:preflight` 并确认报告结论为通过。
- 已确认测试资料可以按脚本清理，不会误删业务源码和文档。

## 真实资料上传后只读检查

真实资料通过本机页面上传后，先执行只读检查：

```bash
npm run real-data:postcheck
```

该命令只读取 `apps/api/storage/uploads`、`apps/api/storage/metadata/documents.json` 和 `apps/api/storage/metadata/audit-logs.json`，不会连接数据库，不会删除文件，也不会写库。它会检查：

- 上传文件是否仍在 `.gitignore` 保护范围内。
- metadata 是否没有被 Git 跟踪。
- 每条资料记录是否有产品、类型、版本、预览地址和本地文件。
- 是否存在孤儿上传文件或缺失文件。
- 是否存在明显重复的同产品、同类型、同工序、同版本资料。

报告路径：

```text
docs/generated/real-data-post-upload-check-report.md
```

如果当前明确已经上传了真实测试资料，建议使用严格模式，要求至少存在 1 条资料记录：

```bash
npm run real-data:postcheck:strict
```

## 真实资料本机测试后清理

真实 PDF、SOP 图片、成品图只能用于本机测试，不要提交到 Git。测试后先执行 dry-run：

```bash
npm run real-data:cleanup:dry
```

页面上传弹窗会自动给本机测试资料追加 `HL_REAL_DATA_TEST` 关键词和备注标记。默认清理命令只识别带该标记或自动化 sandbox 标记的资料，不会清空全部本机上传沙盒。

该命令只生成清理报告，不删除文件。请检查：

- 将清理的资料记录数量。
- 将清理的上传文件清单。
- 将清理的资料审计记录数量。
- 报告路径：`docs/generated/real-data-test-cleanup-report.md`。

确认清单无误后，再执行：

```bash
npm run real-data:cleanup
```

`real-data:cleanup` 会先备份到 `local-backups/real-data-test-cleanup-*`，再清理：

- `apps/api/storage/uploads` 下与测试标记资料关联的本地上传文件。
- `apps/api/storage/metadata/documents.json` 中带测试标记的资料记录。
- `apps/api/storage/metadata/audit-logs.json` 中与这些测试资料记录关联的审计记录。

如果你明确要清空本机上传沙盒中的全部本地上传资料，先执行：

```bash
npm run real-data:cleanup:all-local:dry
```

确认报告无误后，再执行：

```bash
npm run real-data:cleanup:all-local
```

`all-local` 会清理全部 `manual_upload` 资料及 `uploads` 文件，只能在确认本机沙盒没有需要保留的测试资料后使用。

清理后建议再次执行：

```bash
npm run security:check
npm run file-flow:check
```

确认没有真实客户资料、metadata、上传文件进入 Git。
