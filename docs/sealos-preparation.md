# Sealos PostgreSQL 接入准备

## 当前阶段

V0.6 仍然不连接真实 Sealos PostgreSQL。默认配置为 `DATA_SOURCE=mock`，Prisma Repository 仍是后续接入真实数据库的适配层骨架。

## 接入前检查

真实迁移前先调用：

```text
GET /api/migration/preview
```

确认预览统计、资料元数据、上传资料数量和审计记录数量符合预期。

## 迁移数据范围

后续迁移建议包括：

- customers
- products
- productionPlans
- documents 元数据
- frontParameters
- backPackages
- feedbackRecords
- confirmationRecords
- auditLogs

文件本体不建议写入 PostgreSQL。PDF、图片等文件后续建议迁移到对象存储、企业微信微盘同步源或专用文件服务。

## 测试库流程

1. 在 Sealos 创建测试库。
2. 准备备份、回滚和导入校验方案。
3. 配置本地 `.env`，仅在确认后设置 `DATA_SOURCE=prisma` 和真实 `DATABASE_URL`。
4. 实现 `repositories/prisma` 下的真实查询和写入。
5. 在测试库执行 migration。
6. 使用 `GET /api/migration/export-seed` 的 JSON 结构准备 seed 或导入脚本。
7. 验证计划、资料、版本历史、审计、搜索、readiness 和反馈接口。
8. 测试库验证通过后，再评估生产库迁移。

## 生产库注意事项

- 生产库迁移前必须备份。
- 不要直接在生产环境执行未验证的 migration。
- 不要在未确认权限和备份策略前执行 `prisma db push`。
- 不要提交真实 `DATABASE_URL`。
- 当前不连接企业微信微盘、不连接对象存储、不调用真实语音平台。
# V0.7 Sealos PostgreSQL 测试库准备

## 当前状态

V0.7 只完成测试库接入准备，不连接真实 Sealos PostgreSQL，不执行迁移，不写入数据库。

默认 `.env.example`：

```env
DATA_SOURCE=mock
DB_TARGET=local
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
ALLOW_TEST_DB_CONNECT=false
ALLOW_PRISMA_WRITE=false
ALLOW_DESTRUCTIVE_DB_ACTIONS=false
SEED_MODE=dry-run
```

## 后续测试库接入顺序

1. 在 Sealos 创建 PostgreSQL 测试库，不使用生产库。
2. 在本地 `.env` 配置测试库 `DATABASE_URL`，不要提交该文件。
3. 设置 `DB_TARGET=test`。
4. 只做读取验证时设置 `DATA_SOURCE=prisma` 和 `ALLOW_TEST_DB_CONNECT=true`。
5. 先执行 `npm run migration:validate -w api`。
6. 再执行 `npm run migration:preview -w api` 和 `npm run prisma:seed:dry-run -w api`。
7. 只有确认测试库、备份和 seed 内容后，才允许考虑设置 `ALLOW_PRISMA_WRITE=true`。

## 本阶段禁止执行

- `npx prisma migrate dev`
- `npx prisma migrate deploy`
- `npx prisma db push`
- `npx prisma db seed`
- `npm run prisma:seed:test-db -w api`

## 安全接口

- `GET /api/system/data-source`
- `GET /api/system/database-safety`

前端迁移预览弹窗会展示当前是否允许测试库连接、是否允许 Prisma 写入、是否允许危险操作。
# V0.8A 操作顺序

1. 在 Sealos 创建 PostgreSQL 测试库。
2. 复制测试库连接串。
3. 本机创建 `apps/api/.env.local`，不要提交该文件。
4. 设置 `DB_TARGET=test`。
5. 设置 `ALLOW_TEST_DB_CONNECT=true`。
6. 保持 `ALLOW_PRISMA_WRITE=false`。
7. 保持 `ALLOW_DESTRUCTIVE_DB_ACTIONS=false`。
8. 执行 `npm run db:readonly-check -w api`。
9. 执行 `npm run migration:validate -w api`。
10. 执行 `npm run migration:preview -w api`。
11. 执行 `npm run prisma:seed:dry-run -w api`。
12. 执行 `npm run prisma:migration:sql-preview -w api`。
13. 确认无误后再进入 V0.8B。

V0.8A 禁止执行 `prisma migrate dev/deploy`、`prisma db push`、真实 seed 和任何写库操作。
