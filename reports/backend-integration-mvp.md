# Backend Integration MVP 报告

## 1. 状态
完成。

四个后端 Agent 分支已按 A -> D -> B -> C 顺序合并到 `backend-integration-mvp`。API build、Prisma validate/generate、临时 Postgres migration、登录与文件/PDF preview smoke test 均已通过。

## 2. 分支和 commit
- 分支：`backend-integration-mvp`
- commit hash：`e176643a18d9610c4d4be1afe71020d7c5c82eab`（代码集成 commit；本报告在后续报告提交中加入）
- git status：代码提交后 clean；报告生成时新增本报告文件

## 3. 合并来源
- `agent-a-auth`：`e8e015ef16d12301eb9d698b08c6de918f48b410`
- `agent-b-files`：`f3e443be22767d58bcd5f2b1e6f2889c6b2b7e30`
- `agent-c-pdf-preview`：`1c41e350f6c4dddf525e00e4df9f20a588818eed`
- `agent-d-core-api`：`09eab36a9fc6b5c415144658f2857e18995d08b1`

## 4. 冲突处理
| 文件 | 冲突来源 | 处理方式 |
|---|---|---|
| `apps/api/package.json` | A vs current | 保留现有 `start:prod/start:cloud`，加入 `seed:admin`。 |
| `apps/api/src/auth/*` | A vs existing mock auth | 合并 JWT 登录/refresh/logout/me，保留 mock-users/mock-login/permissions 开发入口。 |
| `apps/api/src/app.module.ts` | A/D vs current | 去重 AuthModule，补齐 Auth/Users/Orders/Customers/Products/Documents/Files/Storage。 |
| `apps/api/src/documents/documents.service.ts` | D/B/C vs current | 保留列表、6 分类、上传、下载、文件流、文件健康、metadata 创建，加入 PDF/image preview wrapper。 |
| `apps/api/src/documents/documents.controller.ts` | B/C vs current | 合并 upload/download/file/preview/preview-pages/detail/list，类级 JWT。 |
| `apps/api/src/documents/documents.module.ts` | B/C vs current | 注册 DocumentFileAccessGuard、PdfPreviewService、PdfPreviewWorker。 |
| `apps/api/src/files/*` | B vs current | 统一委托 DocumentsService 文件流，保留 `/files/documents/...` 和 `/files/:documentId`。 |
| `apps/api/src/storage/*` | B vs current | 保留当前 provider 架构和 mount check，补 B 的 save/get/delete 兼容入口。 |
| `apps/api/src/repositories/*document*` | B/D vs current | 合并 storage/checksum 字段映射，保留单有效版本规则。 |
| `apps/api/src/mock/mock-store.ts` | D vs current | 保留 imported business data 恢复逻辑。 |
| `reports/agent-x.md` | A/B/C/D add-add | 改为来源报告索引，不覆盖各 Agent 原报告。 |

## 5. 最终接口清单
| 方法 | 路径 | 是否鉴权 | 用途 |
|---|---|---|---|
| GET | `/api/health` | 否 | 健康诊断 |
| GET | `/api/storage/status` | 否 | 存储配置诊断 |
| GET | `/api/storage/mount-readiness` | 否 | 本地挂载只读诊断 |
| POST | `/api/auth/login` | 否 | 登录获取 token |
| POST | `/api/auth/refresh` | 否 | 刷新 token |
| POST | `/api/auth/logout` | 是 | 登出并清 refresh token |
| GET | `/api/auth/me` | 是 | 当前用户 |
| GET | `/api/orders/today` | 是 | 今日订单 |
| GET | `/api/orders/week` | 是 | 本周订单 |
| GET | `/api/orders?scope=all|today|week` | 是 | 订单列表 |
| GET | `/api/orders/:id` | 是 | 订单详情 |
| PATCH | `/api/orders/:id/production-status` | 是 | 更新生产状态 |
| PATCH | `/api/orders/:id/complete` | 是 | 完成订单 |
| GET/POST | `/api/customers` | 是 | 客户列表/创建 |
| PATCH/DELETE | `/api/customers/:id` | 是 | 客户更新/删除 |
| GET/POST | `/api/products` | 是 | 产品列表/创建 |
| GET | `/api/products/:id/documents` | 是 | 产品 6 分类资料 |
| PATCH/DELETE | `/api/products/:id` | 是 | 产品更新/删除 |
| GET | `/api/documents` | 是 | 资料列表查询 |
| POST | `/api/documents/upload` | 是 | 上传 PDF/JPG/PNG/WEBP |
| GET | `/api/documents/:id` | 是 | 资料详情 |
| GET | `/api/documents/:id/download` | 是 | 下载原文件 |
| GET | `/api/documents/:id/file` | 是 | 读取原文件流 |
| GET | `/api/documents/:id/preview` | 是 | 获取 PDF/image preview 状态和页面 |
| GET | `/api/documents/:id/preview-pages/:pageNo` | 是，可 `?accessToken=` | 读取 preview page 图片 |
| GET | `/api/files/documents/:documentId/preview` | 是 | 文件预览兼容入口 |
| GET | `/api/files/documents/:documentId/download` | 是 | 文件下载兼容入口 |
| GET | `/api/files/:documentId` | 是 | 文件读取兼容入口 |

## 6. 数据库变化
- migration：`apps/api/prisma/migrations/20260628031500_add_auth_fields_to_users/migration.sql`
- schema 变化：
  - `User` 映射到 `users`
  - 新增/保留 `passwordHash`、`refreshTokenHash`、`lastLoginAt`
  - Prisma generator 增加 `moduleFormat = "cjs"`，修复 Nest/CommonJS runtime 加载 Prisma 7 generated client
- seed 方法：
  - `npm run seed:admin -w api` 目前 ts-node 直跑会遇到 Prisma 7 generated client ESM/CJS 问题
  - build 后可用 `node apps/api/dist/src/auth/scripts/seed-admin.js`
  - smoke 使用 admin/admin password：`admin` / `Admin@123456`

## 7. 环境变量
| 变量 | 是否必填 | 用途 |
|---|---|---|
| `NODE_ENV` | 是 | production/development 行为 |
| `PORT` | 是 | API 端口 |
| `API_PREFIX` | 是 | 默认 `api` |
| `CORS_ORIGINS` | 生产必填 | HTTPS 前端/ArkTS 来源 |
| `DATABASE_URL` | auth/production 必填 | PostgreSQL users 与 Prisma 数据库 |
| `DATABASE_SSL_MODE` | Sealos 通常必填 | `require` 或测试本地 `disable` |
| `JWT_ACCESS_SECRET` | 生产必填 | access token 签名 |
| `JWT_REFRESH_SECRET` | 生产必填 | refresh token 签名 |
| `JWT_ACCESS_EXPIRES_IN` | 否 | 默认 `15m` |
| `JWT_REFRESH_EXPIRES_IN` | 否 | 默认 `7d` |
| `AUTH_BCRYPT_ROUNDS` | 否 | 默认 `12` |
| `DATA_SOURCE` | 是 | `mock` 或 `postgres` |
| `FILE_STORAGE_PROVIDER` | 是 | `local` 或 `s3` |
| `STORAGE_ROOT` | local 必填 | 本地持久化根目录 |
| `METADATA_ROOT` | local 必填 | metadata 目录 |
| `STORAGE_TEMP_ROOT` | local 必填 | 临时目录 |
| `S3_ENDPOINT`/`S3_BUCKET`/`S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` | S3 必填 | 对象存储 |
| `S3_FORCE_PATH_STYLE` | S3 常用 | Sealos/MinIO 类对象存储通常为 `true` |
| `S3_OBJECT_PREFIX` | 否 | 对象 key 前缀 |
| `S3_SIGNED_URL_TTL_SECONDS` | 否 | S3 signed URL TTL |
| `PDFTOPPM_PATH` | 否 | pdftoppm 不在 PATH 时指定 |
| `PDF_PREVIEW_DENSITY` | 否 | 默认 144 |
| `PDF_PREVIEW_TIMEOUT_MS` | 否 | 默认 120000 |
| `PDF_PREVIEW_SYNC_WAIT_MS` | 否 | 首次 preview 同步等待窗口 |

## 8. Sealos 部署注意事项
- `poppler-utils`：`Dockerfile.api` 已在 runtime 镜像安装，用于 `pdftoppm`。
- storage 持久化：local fallback 必须挂载 `STORAGE_ROOT=/data/hanglian`，至少持久化 `/data/hanglian/uploads`、`metadata`、`tmp`。
- S3/Object Storage：推荐生产使用 `FILE_STORAGE_PROVIDER=s3`，配置 `S3_ENDPOINT/S3_BUCKET/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY/S3_FORCE_PATH_STYLE/S3_OBJECT_PREFIX`。
- HTTPS：公网首版应只暴露 HTTPS 域名，ArkTS `API_BASE_URL` 使用 HTTPS。
- CORS：设置 `CORS_ORIGINS=https://<tablet-or-web-domain>`；如 cookie 未使用，`CORS_ALLOW_CREDENTIALS=false` 即可。

## 9. 测试结果
- `npm ci`：通过。
- `npm run prisma:validate`：通过。
- `npm run prisma:generate`：通过。
- `npm run build -w api`：通过。
- `npx prisma migrate deploy`（在 `apps/api` 目录，临时 Docker Postgres）：通过，3 个 migration 全部应用。
- `npm run seed:admin -w api`：失败，原因 `exports is not defined in ES module scope`。已通过 `moduleFormat = "cjs"` 修复 runtime client，并使用 build 产物 seed。
- `node apps/api/dist/src/auth/scripts/seed-admin.js`：通过。
- 第一次 PDF preview smoke：失败，原因本机 `pdftoppm.cmd` wrapper 找不到内部路径；改用实际 `pdftoppm.exe` 后通过。Sealos Docker 使用 `poppler-utils` 不依赖该 Windows wrapper。
- 最终 smoke test：通过。
  - 登录：通过
  - me：通过
  - 今日订单：通过，返回 4 条 demo order
  - 上传 PDF：通过
  - PDF preview：ready，1 页
  - preview page 1：通过，`image/png`
  - 下载原 PDF：通过，`application/pdf`
  - 上传 PNG：通过
  - 图片 preview：ready，1 页
  - 产品资料 6 分类：通过，返回 `original_drawing/sop/finished_image/auxiliary_spec/notice/tooling`

## 10. ArkTS 对接说明
- `API_BASE_URL` 示例：`https://<sealos-api-domain>/api`
- 登录接口：
```json
POST /auth/login
{ "username": "admin", "password": "Admin@123456" }
```
返回结构：
```json
{
  "tokenType": "Bearer",
  "accessToken": "...",
  "refreshToken": "...",
  "accessTokenExpiresIn": "15m",
  "refreshTokenExpiresIn": "7d",
  "user": { "id": "...", "username": "admin", "displayName": "Admin", "role": "ADMIN" }
}
```
- 上传接口：`POST /documents/upload`，`multipart/form-data`，Header `Authorization: Bearer <accessToken>`。
  - `file`: PDF/JPG/PNG/WEBP
  - `productId`
  - `planId` 可选
  - `documentType`: `drawing_pdf|sop_image|connector_manual|pinout_diagram|finished_detail_image|process_card`
  - `title`
  - `version`
  - `status`: `effective|pending_review|expired|missing|inconsistent`
  - `requiredForProcess`: `front|back|common`
  - `keywords` 可选
- preview 接口：`GET /documents/:id/preview?accessToken=<accessToken>`。
```json
{
  "documentId": "...",
  "title": "...",
  "fileType": "application/pdf",
  "pageCount": 1,
  "previewStatus": "ready",
  "pages": [{ "pageNo": 1, "imageUrl": "/api/documents/.../preview-pages/1?accessToken=...", "width": 1224, "height": 792 }]
}
```
- preview page 图片访问方式：
  - ArkTS Image 不需要 Bearer header 时，直接使用 `imageUrl`，其中带短期 `accessToken` query。
  - 如果用 ApiClient 下载缓存，也可请求 `GET /documents/:id/preview-pages/:pageNo` 并带 Bearer header。
- 订单侧边栏接口：
  - 今日：`GET /orders/today`
  - 本周：`GET /orders/week`
  - 列表：`GET /orders?scope=today|week|all`
  - 详情：`GET /orders/:id`
- 产品 6 分类资料接口：
  - `GET /products/:id/documents`
  - 返回 `categories`，固定包含 `original_drawing`、`sop`、`finished_image`、`auxiliary_spec`、`notice`、`tooling`

## 11. 给 ChatGPT 的短摘要
=== BACKEND_INTEGRATION_SUMMARY_START ===
状态：完成
分支：backend-integration-mvp
commit：e176643a18d9610c4d4be1afe71020d7c5c82eab
build 是否通过：是
smoke test 是否通过：是
登录是否通过：是
上传 PDF 是否通过：是
PDF preview 是否通过：是，ready
preview page 是否通过：是，image/png
图片上传预览是否通过：是
订单接口是否通过：是，/orders/today 返回 4 条 demo order
产品资料 6 分类是否通过：是
数据库 migration：20260628031500_add_auth_fields_to_users；本地临时 Postgres migrate deploy 通过
Sealos 需要新增环境变量：JWT_ACCESS_SECRET、JWT_REFRESH_SECRET、DATABASE_URL、DATABASE_SSL_MODE、FILE_STORAGE_PROVIDER/STORAGE_ROOT 或 S3_*、PDF_*、CORS_ORIGINS
Sealos 需要新增系统依赖：poppler-utils（Dockerfile.api 已安装）
阻塞问题：无；注意 `npm run seed:admin -w api` 的 ts-node 直跑仍有 ESM/CJS 限制，生产可用 build 产物 seed 或后续改脚本 runner
需要下一步处理：部署到 Sealos 后配置 HTTPS/CORS/持久化卷或 S3，并执行 production smoke
=== BACKEND_INTEGRATION_SUMMARY_END ===
