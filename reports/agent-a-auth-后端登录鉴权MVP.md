# agent-a-auth 后端登录鉴权 MVP 报告

## 基本信息

- 工作分支：`agent-a-auth`
- 工作目录：`C:\Users\31175\Desktop\hanglian-agent-a-auth`
- 基线：本地缓存的 `origin/main`
- 说明：尝试 `git fetch origin main` 时本机 GitHub HTTPS/TLS 握手失败，因此基于本地已有 `origin/main` 创建 worktree。

## 任务范围完成情况

- 已检查主分支后端：未发现已有 `auth`、`users`、`jwt`、`guards` 登录鉴权实现。
- 已新增 NestJS 后端登录鉴权 MVP。
- 已实现接口：
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- 已新增可复用 `JwtAuthGuard`，后续其他 controller 可直接接入登录保护。
- 已使用 PostgreSQL `users` 表。
- 密码只保存 `passwordHash`，不保存明文。
- refresh token 只保存 `refreshTokenHash`，退出登录会清空。
- 未实现复杂角色权限，只判断用户是否已登录、是否 active、是否未软删除。
- 已提供 admin 初始化脚本：`npm run seed:admin -w api`。

## 主要变更

- 新增 `apps/api/src/auth/`：
  - auth controller/service/module
  - login/refresh DTO
  - JWT payload 类型
  - `JwtAuthGuard`
  - `CurrentUser` 装饰器
  - admin seed 脚本
- 新增 `apps/api/src/users/`：
  - users module/service
  - Prisma users client
  - user 类型与 public user 映射
- 修改 `apps/api/src/app.module.ts`：
  - 挂载 `AuthModule`
- 修改 `apps/api/package.json`：
  - 新增 `seed:admin` 脚本
- 修改 `apps/api/prisma/schema.prisma`：
  - `User` 增加 `passwordHash`、`refreshTokenHash`、`lastLoginAt`
  - `User` 映射到 PostgreSQL `users` 表
- 新增 Prisma migration：
  - `apps/api/prisma/migrations/20260628031500_add_auth_fields_to_users/migration.sql`

## Migration 原因

原 `User` 模型没有登录所需字段，无法支持密码 hash、refresh token 轮换和登录时间记录。本次新增 migration 是非破坏性迁移：

- 不删除现有用户数据。
- 如果已有旧 `"User"` 表且没有 `users` 表，会重命名为 `users`。
- 如果已有 `users` 表，只补充缺失字段。
- 使用 `ADD COLUMN IF NOT EXISTS` 和 `CREATE TABLE IF NOT EXISTS` 降低重复执行风险。

## 限制遵守情况

- 未修改前端。
- 未修改 documents、orders、products 的业务逻辑。
- 未删除任何现有功能。
- 未删除现有用户数据。
- 修改集中在后端 auth/users/jwt/guard 及必要的 app module、Prisma user schema、migration、seed 脚本入口。

## 已执行验证

已在 `C:\Users\31175\Desktop\hanglian-agent-a-auth` 执行：

```powershell
npm install --ignore-scripts
npm run prisma:format
npm run prisma:validate
npm run prisma:generate
npm run build:api
```

验证结果：

- `prisma:validate` 通过。
- `prisma:generate` 通过。
- `build:api` 通过。

## 测试命令

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

## curl 示例

```powershell
$BASE="https://你的-sealos-公网域名"

$loginBody = @{ username="admin"; password=$env:ADMIN_PASSWORD } | ConvertTo-Json -Compress
$login = curl.exe -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d $loginBody | ConvertFrom-Json

$accessToken = $login.accessToken
$refreshToken = $login.refreshToken

curl.exe -s "$BASE/api/auth/me" -H "Authorization: Bearer $accessToken"

$refreshBody = @{ refreshToken=$refreshToken } | ConvertTo-Json -Compress
curl.exe -s -X POST "$BASE/api/auth/refresh" -H "Content-Type: application/json" -d $refreshBody

curl.exe -s -X POST "$BASE/api/auth/logout" -H "Authorization: Bearer $accessToken"
```

## 审查关注点

- 生产环境必须配置 `JWT_ACCESS_SECRET` 和 `JWT_REFRESH_SECRET`。
- 生产环境 admin seed 必须显式配置 `ADMIN_PASSWORD`。
- 本次只提供登录鉴权 MVP，尚未把资料接口 controller 实际套上 guard。
- Auth 写入 refresh token hash 和 admin seed 写入用户表，是本任务登录闭环所需的最小写库行为。
