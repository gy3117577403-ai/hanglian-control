# V3.17 Cloud Staging API 更新指南

本指南只用于更新现有 Sealos API 应用的参数复核。本轮不实际操作 Sealos，不连接 PostgreSQL，不接入 S3，不上传真实客户资料。

## 现有应用

- API 应用：`hanglian-control-api`
- 端口：`3000`
- 健康检查：`/api/health`
- 存储卷：复用现有 1 GiB 卷
- 挂载路径：`/data/hanglian`
- 禁止创建第二个测试卷

## 候选镜像

- API 镜像：`ghcr.io/gy3117577403-ai/hanglian-control-api:<最终不可变标签>`
- API digest：等待 GitHub Actions 输出后记录
- Tablet 镜像：`ghcr.io/gy3117577403-ai/hanglian-control-tablet:<最终不可变标签>`
- Tablet digest：等待 GitHub Actions 输出后记录
- 禁止使用：`latest`

## Cloud Staging 环境变量

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
API_PREFIX=api

DATA_SOURCE=mock
DEMO_DATA_MODE=demo
DEPLOYMENT_STAGE=v3.17-cloud-staging
DB_TARGET=local

FILE_STORAGE_PROVIDER=local
STORAGE_ROOT=/data/hanglian
METADATA_ROOT=/data/hanglian/metadata
STORAGE_TEMP_ROOT=/data/hanglian/tmp
STORAGE_MAX_FILE_SIZE_MB=30
STORAGE_URL_MODE=proxy

CORS_ORIGINS=https://localhost,https://fqbkxzzolqqq.sealoshzh.site
CORS_ALLOW_CREDENTIALS=false

RUN_PRISMA_MIGRATE_DEPLOY=false
ALLOW_TEST_DB_CONNECT=false
ALLOW_PRISMA_WRITE=false
ALLOW_DESTRUCTIVE_DB_ACTIONS=false
SEED_MODE=dry-run
```

不得配置：

- `DATABASE_URL`
- `DIRECT_URL`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- 企业微信 Secret
- 语音平台 Secret

## CORS

必须允许：

- `https://localhost`
- `https://fqbkxzzolqqq.sealoshzh.site`

禁止使用通配符 `*`，并保持 `CORS_ALLOW_CREDENTIALS=false`。

## 数据库与存储边界

- 不配置 `DATABASE_URL`
- `DATA_SOURCE=mock`
- `ALLOW_PRISMA_WRITE=false`
- `RUN_PRISMA_MIGRATE_DEPLOY=false`
- 不执行 migration
- 不执行 seed
- 不配置 S3
- 只使用 `/data/hanglian` 上的本地 JSON metadata 和假资料

## 更新顺序

1. 记录当前镜像。
2. 记录当前环境变量名称。
3. 记录 PVC 名称和挂载路径。
4. 更新镜像到 GitHub Actions 输出的不可变标签。
5. 保持副本数为 `1`。
6. 保持现有持久化卷，不创建新卷。
7. 复核 pod 模板仍包含 `fsGroup=1000`。
8. 等待应用进入 `Running 1/1`。
9. 检查 `GET /api/health`。
10. 检查 `GET /api/storage/status`。
11. 检查 `GET /api/runtime/info`。
12. 检查已有假资料预览。
13. 禁止执行 migration。
14. 禁止修改数据库配置。
15. 出错时回滚旧镜像，不删除卷。

## fsGroup 复核

部署模板示例见 `deploy/sealos/api-v3.17-cloud-staging.yaml`。App Launchpad 更新可能覆盖手工 fsGroup 设置，每次更新后都必须复核 StatefulSet/Deployment pod 模板仍包含：

```yaml
securityContext:
  fsGroup: 1000
  fsGroupChangePolicy: OnRootMismatch
```

## 回滚

若 health、storage status、runtime info 或假资料预览失败：

1. 立即切回更新前记录的旧镜像。
2. 保留现有 PVC。
3. 不删除 `/data/hanglian`。
4. 不执行 migration、db push 或 seed。
5. 记录失败日志和当前镜像 digest。
