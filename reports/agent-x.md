# agent-x 报告

## 状态

- 状态：已完成后端登录鉴权 MVP。
- 当前工作树：有未提交改动。
- 未直接修改 `main/master`。
- 未新建独立项目。
- 未修改前端。
- 未修改 documents、orders、products 的业务逻辑。

## 分支

- 分支：`agent-a-auth`
- worktree：`C:\Users\31175\Desktop\hanglian-agent-a-auth`
- 基线：本地缓存的 `origin/main`

## commit

- 当前 HEAD：`8d7e6930ad75fe53fe3c6ba9a080f550004be440`
- 当前 HEAD 摘要：`8d7e693 chore: initialize wire harness control system v0.9`
- 本任务尚未创建新 commit。

## 修改文件

- 修改：
  - `apps/api/package.json`
  - `apps/api/prisma/schema.prisma`
  - `apps/api/src/app.module.ts`
- 新增：
  - `apps/api/prisma/migrations/20260628031500_add_auth_fields_to_users/migration.sql`
  - `apps/api/src/auth/auth.controller.ts`
  - `apps/api/src/auth/auth.module.ts`
  - `apps/api/src/auth/auth.service.ts`
  - `apps/api/src/auth/decorators/current-user.decorator.ts`
  - `apps/api/src/auth/dto/login.dto.ts`
  - `apps/api/src/auth/dto/refresh-token.dto.ts`
  - `apps/api/src/auth/guards/jwt-auth.guard.ts`
  - `apps/api/src/auth/index.ts`
  - `apps/api/src/auth/jwt-payload.interface.ts`
  - `apps/api/src/auth/scripts/seed-admin.ts`
  - `apps/api/src/users/index.ts`
  - `apps/api/src/users/prisma-users.client.ts`
  - `apps/api/src/users/user.types.ts`
  - `apps/api/src/users/users.module.ts`
  - `apps/api/src/users/users.service.ts`
  - `reports/agent-a-auth-后端登录鉴权MVP.md`
  - `reports/agent-x.md`

## 新增接口

- `POST /api/auth/login`
  - 使用 username/password 登录。
  - 返回 `accessToken`、`refreshToken` 和当前用户信息。
- `POST /api/auth/refresh`
  - 使用 refresh token 刷新 token pair。
  - 校验数据库中保存的 refresh token hash。
- `POST /api/auth/logout`
  - 需要 `Authorization: Bearer <accessToken>`。
  - 清空当前用户的 refresh token hash。
- `GET /api/auth/me`
  - 需要 `Authorization: Bearer <accessToken>`。
  - 返回当前登录用户信息。

## 数据库变化

- `User` Prisma model 映射到 PostgreSQL `users` 表。
- 新增可空字段：
  - `passwordHash`
  - `refreshTokenHash`
  - `lastLoginAt`
- 新增 migration：`20260628031500_add_auth_fields_to_users`
- migration 设计：
  - 如果已有旧 `"User"` 表且没有 `users` 表，会重命名为 `users`。
  - 如果已有 `users` 表，只补字段。
  - 使用 `CREATE TABLE IF NOT EXISTS`、`ADD COLUMN IF NOT EXISTS`、`CREATE UNIQUE INDEX IF NOT EXISTS`。
  - 不删除现有用户数据。
- admin seed：
  - 命令：`npm run seed:admin -w api`
  - upsert 管理员用户。
  - 密码只保存 hash，不保存明文。

## 环境变量

- 数据库：
  - `DATABASE_URL`
  - `DATABASE_SSL_MODE`
- JWT：
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `JWT_SECRET` 可作为兼容 fallback
  - `JWT_ACCESS_EXPIRES_IN`
  - `JWT_REFRESH_EXPIRES_IN`
- 密码 hash：
  - `AUTH_BCRYPT_ROUNDS`
- admin seed：
  - `ADMIN_USERNAME`
  - `ADMIN_PASSWORD`
  - `ADMIN_DISPLAY_NAME`
  - `ADMIN_ROLE`
- 运行：
  - `NODE_ENV`
  - `PORT`
  - `API_PREFIX`

## 测试命令

已执行：

```powershell
npm install --ignore-scripts
npm run prisma:format
npm run prisma:validate
npm run prisma:generate
npm run build:api
```

最新复验：

```powershell
npm run prisma:validate
npm run build:api
```

建议联调命令：

```powershell
cd C:\Users\31175\Desktop\hanglian-agent-a-auth

$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
$env:JWT_ACCESS_SECRET="change-me-access"
$env:JWT_REFRESH_SECRET="change-me-refresh"
$env:ADMIN_PASSWORD="Admin@123456"

npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
npm run prisma:generate
npm run seed:admin -w api
npm run dev:api
```

## 测试结果

- `npm run prisma:format`：通过。
- `npm run prisma:validate`：通过。
- `npm run prisma:generate`：通过。
- `npm run build:api`：通过。
- 未执行真实 Sealos 数据库迁移、seed、curl 联调，因为当前环境没有可用真实 `DATABASE_URL`。

## 阻塞问题

- `git fetch origin main` 失败：
  - 原因：本机访问 GitHub 时出现 HTTPS/TLS 握手失败。
  - 处理：基于本地已缓存的 `origin/main` 创建 worktree/branch。
- 未做公网 Sealos HTTPS 实测：
  - 原因：当前没有真实 Sealos `DATABASE_URL` 和公网 API 地址。

## 集成建议

- 在 Sealos 环境配置强随机值：
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `ADMIN_PASSWORD`
- 部署前执行：
  - `npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma`
  - `npm run prisma:generate`
  - `npm run seed:admin -w api`
- 后续资料接口接入保护时，在对应 controller 上使用：
  - `@UseGuards(JwtAuthGuard)`
- refresh token 当前采用单 token hash 存储，适合 MVP；如果后续要支持多设备登录，建议新增 refresh token session 表。
- 不要把真实 `DATABASE_URL`、JWT secret、admin 密码提交到仓库。
