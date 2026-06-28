# Agent S Sealos 部署验证报告

日期: 2026-06-28
分支: `agent-s-sealos-deploy-check`
基线: `backend-integration-mvp` at `1b369ae`

## 结论

Sealos 生产部署准备已整理到配置和验证脚本层面。未拿到 Sealos 公网域名、数据库连接串、JWT secret、管理员密码或对象存储凭据，因此本分支没有执行真实公网 HTTPS smoke test。

关键结论:

- `Dockerfile.api` 已安装 `poppler-utils`，PDF 预览运行时应能找到 `pdftoppm`。
- API 生产启动命令为 `node apps/api/scripts/start-cloud.mjs`，Sealos App 命令可留空使用镜像 `CMD`。
- Prisma migration 应优先作为一次性 Sealos Job/迁移镜像执行，不建议把迁移开关长期留在 API App 上。
- 迁移命令已统一到 Prisma config: `prisma migrate deploy --config=/app/apps/api/prisma.config.ts`。
- build 后 seed admin 命令为 `node apps/api/dist/src/auth/scripts/seed-admin.js`，避免生产里走 `npm run seed:admin -w api` 的 TS/ESM/CJS 限制。
- 本地 storage fallback 若用于生产，Sealos API App 必须挂载 `/data/hanglian` 持久化卷。
- S3/Object Storage 已是可选方案，`FILE_STORAGE_PROVIDER=s3` 且 S3 变量完整时启用。
- ArkTS `API_BASE_URL` 最终写法: `https://<sealos-api-domain>/api`。

## 必查项

| 检查项 | 状态 | 结论 |
| --- | --- | --- |
| Dockerfile.api 安装 poppler-utils | 通过 | `RUN apk add --no-cache poppler-utils` 存在 |
| 生产启动命令 | 通过 | 镜像 `CMD ["node", "apps/api/scripts/start-cloud.mjs"]` |
| Prisma migrate deploy 命令 | 通过 | 使用 `--config=prisma.config.ts` / `/app/apps/api/prisma.config.ts` |
| build 后 seed admin | 通过 | 使用 `node apps/api/dist/src/auth/scripts/seed-admin.js` |
| `.env.example` 完整性 | 通过 | 已补 admin seed 占位变量和 migration confirmation |
| local storage fallback 持久化 | 需要 | `FILE_STORAGE_PROVIDER=local` 时必须挂载 `/data/hanglian` |
| S3/Object Storage | 可选 | `FILE_STORAGE_PROVIDER=s3` 且 S3 env 完整时可替代持久化上传卷 |
| CORS_ORIGINS | 需要显式配置 | 生产只允许逗号分隔 HTTPS origin，不带 path |
| ArkTS API_BASE_URL | 明确 | `https://<sealos-api-domain>/api`，不要填 Tablet 域名或 `/tablet` |

## Sealos 环境变量配置表

| 变量 | 建议值 | 必填 | 说明 |
| --- | --- | --- | --- |
| `NODE_ENV` | `production` | 是 | 生产模式 |
| `PORT` | `3000` | 是 | API 容器端口 |
| `API_PREFIX` | `api` | 是 | API 路径前缀，对外为 `/api` |
| `CORS_ORIGINS` | `https://<tablet-domain>` | 是 | 逗号分隔 HTTPS origin；如有 Web/PWA 域名也加入 |
| `DATABASE_URL` | Sealos PostgreSQL URL | 是 | 仅填在 Sealos Secret/Env；建议带 `schema=hanglian_control` |
| `DATABASE_SSL_MODE` | `require` | 是 | Sealos PostgreSQL 通常保持 require |
| `JWT_ACCESS_SECRET` | 长随机字符串 | 是 | 生产必须设置 |
| `JWT_REFRESH_SECRET` | 另一个长随机字符串 | 是 | 不要与 access secret 相同 |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | 是 | access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | 是 | refresh token TTL |
| `AUTH_BCRYPT_ROUNDS` | `12` | 是 | 生产建议 12 起 |
| `DATA_SOURCE` | `postgres` | 是 | 生产数据库模式；当前代码不使用 `prisma` 作为值 |
| `FILE_STORAGE_PROVIDER` | `local` 或 `s3` | 是 | local 需要 PV；s3 需要 S3 变量 |
| `STORAGE_ROOT` | `/data/hanglian` | local 必填 | 上传文件根目录 |
| `METADATA_ROOT` | `/data/hanglian/metadata` | local 必填 | JSON metadata fallback |
| `STORAGE_TEMP_ROOT` | `/data/hanglian/tmp` | 是 | PDF/上传临时文件 |
| `S3_ENDPOINT` | 空或对象存储 endpoint | s3 必填 | local 模式留空 |
| `S3_BUCKET` | 空或 bucket | s3 必填 | local 模式留空 |
| `S3_ACCESS_KEY_ID` | 空或 access key | s3 必填 | 只填 Sealos Secret/Env |
| `S3_SECRET_ACCESS_KEY` | 空或 secret key | s3 必填 | 只填 Sealos Secret/Env |
| `S3_FORCE_PATH_STYLE` | `true` | s3 建议 | MinIO/Sealos 对象存储通常需要 |
| `S3_OBJECT_PREFIX` | `hanglian` | s3 建议 | 对象 key 前缀 |
| `PDFTOPPM_PATH` | 空或 `/usr/bin/pdftoppm` | 否 | poppler 在 PATH 时可留空 |
| `PDF_PREVIEW_DENSITY` | `144` | 是 | PDF 渲染清晰度 |
| `PDF_PREVIEW_TIMEOUT_MS` | `120000` | 是 | PDF 渲染超时 |
| `PDF_PREVIEW_SYNC_WAIT_MS` | `8000` | 是 | 上传后同步等待预览时间 |
| `ADMIN_USERNAME` | 管理员用户名 | seed 必填 | seed admin 用 |
| `ADMIN_PASSWORD` | 强密码 | seed 必填 | 生产 `NODE_ENV=production` 必填 |
| `ADMIN_DISPLAY_NAME` | `Admin` 或实际名称 | seed 必填 | 管理员显示名 |
| `ADMIN_ROLE` | `ADMIN` | seed 必填 | 可选值由代码限制 |

部署还需要这些门禁变量，但它们不属于 ArkTS API_BASE_URL 所需清单:

| 变量 | API 长期运行建议 | 迁移一次性任务建议 |
| --- | --- | --- |
| `DB_TARGET` | `staging` | `staging` |
| `ALLOW_TEST_DB_CONNECT` | 开启 | 开启 |
| `ALLOW_PRISMA_WRITE` | 按生产策略开启 | 迁移时开启 |
| `ALLOW_DESTRUCTIVE_DB_ACTIONS` | 关闭 | 关闭 |
| `RUN_PRISMA_MIGRATE_DEPLOY` | 关闭 | 迁移任务开启 |
| `MIGRATION_CONFIRMATION` | 留空 | `APPLY_V318_MIGRATIONS_TO_STAGING` |

## Sealos 部署步骤

1. 从 `agent-s-sealos-deploy-check` 或合并后的目标提交构建镜像。
2. GitHub Actions 手动运行镜像构建，记录不可变 tag/digest。
3. 创建或选择隔离的 Sealos PostgreSQL 数据库，`DATABASE_URL` 只填在 Sealos UI/Secret。
4. 优先用 migration runner 镜像执行一次迁移:
   - 命令: `node scripts/run-prisma-migrate-deploy.mjs`
   - 实际 Prisma 命令: `prisma migrate deploy --config=/app/apps/api/prisma.config.ts`
5. 创建 API App:
   - 镜像: API image tag
   - 端口: `3000`
   - 健康检查: `/api/health`
   - 命令: 留空，或填 `node apps/api/scripts/start-cloud.mjs`
6. 若 `FILE_STORAGE_PROVIDER=local`，给 API App 挂载持久化卷:
   - mount path: `/data/hanglian`
   - 子目录: `uploads`, `metadata`, `tmp`
   - 建议副本数: `1`
7. 设置 `CORS_ORIGINS` 为 Tablet/Web 的 HTTPS origin，例如 `https://<tablet-domain>`；不要写 `/tablet` 或 `/api` path。
8. 启动 API App 后验证:
   - `GET https://<api-domain>/api/health`
   - Sealos shell: `which pdftoppm && pdftoppm -v`
9. 执行 build 后 admin seed:
   - `node apps/api/dist/src/auth/scripts/seed-admin.js`
10. 运行公网 production smoke:
   - `npm run sealos:production-smoke`

## 生产 smoke test 脚本

脚本路径:

```bash
scripts/sealos-production-smoke.mjs
```

npm 入口:

```bash
npm run sealos:production-smoke
```

必需环境:

```bash
export API_BASE_URL="https://<sealos-api-domain>/api"
export ADMIN_USERNAME="<admin-username>"
export ADMIN_PASSWORD="<admin-password>"
```

可选环境:

```bash
export PRODUCT_ID="<existing-product-id>"
export PDF_FILE="./smoke.pdf"
export PNG_FILE="./smoke.png"
export SMOKE_TIMEOUT_MS="15000"
export SMOKE_PREVIEW_TIMEOUT_MS="120000"
```

脚本覆盖:

| 步骤 | API |
| --- | --- |
| 登录 | `POST /api/auth/login` |
| me | `GET /api/auth/me` |
| today orders | `GET /api/orders/today` |
| upload PDF | `POST /api/documents/upload` |
| preview | `GET /api/documents/:id/preview` |
| preview page | `GET /api/documents/:id/preview-pages/:pageNo` |
| download | `GET /api/documents/:id/download` |
| upload PNG | `POST /api/documents/upload` |
| image preview | `GET /api/documents/:id/preview` |
| products/:id/documents | `GET /api/products/:id/documents` |

说明:

- 未提供 `PDF_FILE`/`PNG_FILE` 时，脚本会生成临时最小 PDF/PNG。
- 未提供 `PRODUCT_ID` 时，脚本会从 `GET /api/products` 自动选择第一个产品。
- 默认要求 `API_BASE_URL` 为 HTTPS；仅本地调试可设置 `ALLOW_HTTP_SMOKE=true`。

## ArkTS API_BASE_URL

最终写法:

```text
API_BASE_URL=https://<sealos-api-domain>/api
```

ArkTS/HarmonyOS 原生 HTTP 客户端使用同一个值。若走本 repo 的 Android/native build env，对应变量是:

```text
VITE_NATIVE_API_BASE_URL=https://<sealos-api-domain>/api
```

不要填写:

- `https://<tablet-domain>/tablet`
- `https://<tablet-domain>`
- `https://<api-domain>` 缺少 `/api`
- 旧硬编码测试域名
- HTTP 明文地址

## CORS 配置

`CORS_ORIGINS` 是逗号分隔 allowlist，只写 origin:

```text
https://<tablet-domain>,https://<other-web-domain>
```

不要写 path、数据库连接串、S3 secret 或通配符。ArkTS 原生 HTTP 客户端通常不受浏览器 CORS 限制，但 Tablet PWA/WebView 入口仍应加入 allowlist。

## Storage 选择

### local fallback

适合首版 Sealos 上线，配置简单，但必须挂持久化卷:

- `FILE_STORAGE_PROVIDER`: `local`
- mount path: `/data/hanglian`
- `STORAGE_ROOT`: `/data/hanglian`
- `METADATA_ROOT`: `/data/hanglian/metadata`
- `STORAGE_TEMP_ROOT`: `/data/hanglian/tmp`

不挂 PV 会导致上传文件、PDF 预览页、metadata 在 Pod 重建后丢失。

### S3/Object Storage

可选，适合后续多副本或更正式生产:

- `FILE_STORAGE_PROVIDER`: `s3`
- 配齐 `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- `S3_FORCE_PATH_STYLE` 建议 `true`
- `S3_OBJECT_PREFIX` 建议 `hanglian`

S3 模式下上传对象不依赖 `/data/hanglian` 持久化卷，但 `STORAGE_TEMP_ROOT` 仍需要可写目录供 PDF/上传临时文件使用。

## 阻塞问题

- 本地没有 Sealos 公网 API 域名和生产 secret，未执行真实公网 HTTPS smoke。
- smoke 上传链路需要数据库中至少有一个产品；空库迁移后需先创建/导入产品或设置 `PRODUCT_ID`。

## 下一步

1. 将本分支变更合并到部署分支后构建 API 和 migration runner 镜像。
2. 在 Sealos 配置 Secret/Env 和 `/data/hanglian` PV。
3. 先跑 migration runner，再跑 build 后 admin seed。
4. 用 `API_BASE_URL=https://<sealos-api-domain>/api npm run sealos:production-smoke` 执行公网 smoke。
5. ArkTS 填入同一个 `https://<sealos-api-domain>/api`。
