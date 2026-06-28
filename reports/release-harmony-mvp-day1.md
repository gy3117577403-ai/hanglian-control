# release-harmony-mvp-day1 发布报告

## 1. 最终分支

- 分支：`release-harmony-mvp-day1`
- 报告生成时合并 HEAD：`7ed010064b9dda1ba166aab736b99aff664ec002`
- 最终 commit：本报告提交后的 `release-harmony-mvp-day1` HEAD，精确 hash 见最终 RELEASE_SUMMARY。

## 2. 合并来源 commit

- `backend-integration-mvp`: `1b369ae898e59de3e9153579a87ccef31d98b9af`
- `agent-j-backend-extra-api`: `08ce9a08f8dc4fa9dedc03fef322c7ae2c06d83d`
- `agent-s-sealos-deploy-check`: `97d72f31cd61db6216910d8fddf6ba3f563360e7`
- `agent-i-arkts-integration`: `fd2dcc7ccee89d27880af228f260f1ae763418cf`

Merge commits created in order:

- `c9b9853` Merge backend integration MVP into release
- `d29962d` Merge backend extra APIs into release
- `32e05d8` Merge Sealos deploy checks into release
- `7ed0100` Merge Harmony Pad ArkTS integration into release

## 3. 冲突处理清单

- Git merge 阶段没有出现文件级冲突。
- 保留后端登录鉴权、documents 上传/下载/preview、connector-params、recycle-bin、Sealos production smoke 脚本和 `harmony-pad` 最终集成版本。
- 未引入第二套 `AppConfig` / `ApiClient` / `TokenStorageService` / `UploadDocumentDialog`。
- README 已补充最终 API_BASE_URL 口径，避免把旧的无 `/api` 或重复 `/api/auth/login` 说明带回发布分支。

## 4. 后端 build 结果

- `npm ci`: 通过
- `npm run build -w api`: 通过
- `npm run sealos:cloud-deploy-check`: 通过
- `npm run cloud:runtime-preflight`: 通过
- `npm run postgres-migration-image:check`: 通过

## 5. Prisma 校验结果

- `npm run prisma:validate`: 通过
- `npm run prisma:generate`: 通过，Prisma Client 生成到 `apps/api/generated/prisma`

## 6. migration 清单

最终包含：

- `20260617000100_initial_schema`
- `20260623010000_v318_persistence_upgrade`
- `20260628031500_add_auth_fields_to_users`
- `20260628080000_add_connector_process_parameters`

非破坏性确认：

- `20260628031500_add_auth_fields_to_users` 使用 `CREATE TYPE` 防重复保护、`CREATE TABLE IF NOT EXISTS`、`ADD COLUMN IF NOT EXISTS` 和唯一索引补齐。
- `20260628080000_add_connector_process_parameters` 新建 `ConnectorProcessParameter` 表和索引。
- 未发现 `DROP TABLE`、`DROP COLUMN`、`TRUNCATE` 或 `DELETE FROM`。

## 7. Sealos 部署步骤摘要

1. 构建 API 镜像和 migration runner 镜像。
2. 在 Sealos 配置生产/准生产环境变量，不提交真实密钥。
3. 先运行 migration runner：`node scripts/run-prisma-migrate-deploy.mjs`。
4. 执行 admin seed：`node apps/api/dist/src/auth/scripts/seed-admin.js`。
5. 本地存储模式为 API App 挂载 PV：`/data/hanglian`。
6. S3/Object Storage 可选；使用 S3 时配置 `FILE_STORAGE_PROVIDER=s3` 和完整 `S3_*` 变量。
7. 启动 API App，镜像默认执行 `node apps/api/scripts/start-cloud.mjs`。
8. MatePad / ArkTS 配置：`API_BASE_URL=https://<sealos-api-domain>/api`。
9. 有真实公网 API 和管理员账号后执行 `npm run sealos:production-smoke`。

Sealos 文件确认：

- `Dockerfile.api` 安装 `poppler-utils`，并复制 `apps/api/prisma.config.ts`。
- `scripts/sealos-production-smoke.mjs` 存在。
- `apps/api/.env.example` 包含 JWT、admin seed、Postgres、migration、storage、PDF preview 和 S3 占位变量。
- README 已说明 migration runner、admin seed、`/data/hanglian` PV、S3 可选和 `API_BASE_URL=https://<sealos-api-domain>/api`。

## 8. ArkTS 工程路径

- 工程路径：`harmony-pad/`
- DevEco Studio 打开路径：`C:\Users\31175\Desktop\hanglian\harmony-pad`

## 9. API_BASE_URL 最终配置位置

- 文件：`harmony-pad/entry/src/main/ets/services/AppConfig.ets`
- 当前值：`https://sealos-api.example.com/api`
- 说明：该值已经包含 `/api`，业务 service 调用 `/auth/login`、`/documents/...`、`/connector-params` 等相对业务路径，不再拼 `/api/auth/login`。

ArkTS 静态确认：

- `AppConfig.ets`: 1 个
- `ApiClient.ets`: 1 个
- `TokenStorageService.ets`: 1 个
- `UploadDocumentDialog.ets`: 1 个
- `ApiConfig.ets`: 0 个
- `WorkbenchPage` 可打开上传弹窗、`DocumentPreviewPage`、`OrderOverviewPage`、`CustomerProductPage`、`ConnectorParamPage`、`RecycleBinPage`。
- `DocumentPreviewPage` 使用 `pages[].imageUrl` 的 `Image(page.imageUrl)` 渲染，不使用 WebView PDF。
- `DocumentPreviewService` 会对 `imageUrl` 追加 `accessToken` query。
- 业务 service 经由 `ApiClient`，`ApiClient` 从 `AppConfig` 读取 `API_BASE_URL`。

## 10. DevEco Studio 编译步骤

1. 打开 DevEco Studio。
2. 选择 `Open Project`，打开 `C:\Users\31175\Desktop\hanglian\harmony-pad`。
3. 同步 HarmonyOS SDK / Hvigor / oh-package 配置。
4. 确认 `entry/src/main/ets/services/AppConfig.ets` 中 `API_BASE_URL` 已替换为真实 `https://<sealos-api-domain>/api`。
5. 执行 `Build > Make Module 'entry'`。
6. 连接 MatePad，选择 tablet 设备，执行 `Run 'entry'`。

## 11. MatePad 真机测试清单

- 启动 App，确认进入登录页。
- 使用 Sealos admin seed 账号登录。
- 登录后进入工作台，确认今日/本周订单可加载。
- 打开上传弹窗，上传 PDF。
- 打开 PDF 预览，确认显示后端 preview pages 的 PNG 图片。
- 上传 PNG/JPG 图片并打开图片预览。
- 下载原文件。
- 打开客户与产品页并加载数据。
- 打开连接器参数库，测试列表、搜索、新增/导入入口。
- 打开回收站，测试列表、恢复、彻底删除入口。
- 测试 token 过期刷新和退出登录。
- 切换网络后重新登录/刷新，确认错误提示可读。

## 12. 未完成 / 未实测项

- 未执行公网 smoke：当前环境缺少 `API_BASE_URL`、`ADMIN_USERNAME`、`ADMIN_PASSWORD`。
- ArkTS 未真实编译：当前环境未提供 DevEco Studio/HarmonyOS SDK CLI。
- 未执行 MatePad 真机测试：需要真实设备和 Sealos 公网 API。
- 未替换真实 Sealos API 域名：`AppConfig.ets` 当前仍为占位 `https://sealos-api.example.com/api`。
