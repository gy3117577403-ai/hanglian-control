# 线束车间生产计划资料管控系统

## V3.0A Sealos 只读验证准备

V3.0A 只准备 Sealos PostgreSQL 测试库只读验证，不执行数据库写入。

```bash
npm run db:readonly-check -w api
npx prisma format --schema=apps/api/prisma/schema.prisma
npx prisma validate --schema=apps/api/prisma/schema.prisma
npx prisma generate --schema=apps/api/prisma/schema.prisma
npm run migration:validate -w api
npm run migration:preview -w api
npm run prisma:seed:dry-run -w api
npm run prisma:migration:sql-preview -w api
npm run sealos:readonly-check
npm run sealos:readonly-report
```

`.env.local` 只保存在本机，禁止提交。`DATABASE_URL` 只允许填入测试库连接串，禁止写入聊天窗口、代码或文档。当前阶段禁止 `prisma migrate`、`prisma db push`、`prisma db seed`、`prisma:seed:test-db` 和任何写库操作。

面向线束车间前段 / 后段组长的安卓平板 PWA 原型。系统围绕“生产计划 -> 产品资料包 -> 前段 / 后段查询 -> 文件预览 -> 版本确认 -> 查询留痕 -> 异常反馈 -> 现场知识验证 -> 现场执行闭环 -> 现场统计看板 -> 全流程总验收”构建。

## 当前版本

V2.7 全流程回归候选版。

当前运行边界：

- 数据源：Mock seed / 本地 metadata。
- Sealos PostgreSQL：未接入。
- 企业微信微盘：未接入。
- 企业微信登录：未接入。
- 真实语音识别：未接入。
- 文件资料：本地开发存储 + 本地上传 / 预览。

## 启动方式

本机开发：

```bash
npm install
npm run dev
```

- 前端：`http://localhost:5173/tablet`
- API：`http://localhost:3000/api`
- Swagger：`http://localhost:3000/api/docs`

平板局域网演示：

```bash
npm run demo:assets
npm run demo:imports
npm run demo:knowledge
npm run import-flow:check
npm run maintenance-flow:check
npm run auth-flow:check
npm run knowledge-flow:check
npm run knowledge-validation:check
npm run execution-flow:check
npm run demo:analytics
npm run analytics-flow:check
npm run full-regression:check
npm run data-consistency:check
npm run acceptance:report
npm run pwa:assets
npm run pwa:check
npm run demo:check
npm run demo:freeze-check
npm run demo:release-check
npm run dev:lan
```

平板浏览器访问终端输出的 `http://<电脑IPv4>:5173/tablet`。电脑和平板需要在同一 Wi-Fi 或同一网段。

Windows 一键启动：

```powershell
.\start-field-demo.ps1
```

或：

```text
start-field-demo.bat
```

## V2.4 功能范围

- 生产计划驱动的暖色立体工业平板界面。
- 后端 Mock API 数据流。
- 本地文件资料上传、预览、版本状态和开工 readiness。
- 数据导入中心。
- 资料维护中心。
- 本地 Mock 角色权限。
- 治具库、异常库、质量标准库。
- 现场知识验证。
- 知识库批量维护。
- 复核队列知识问题联动。
- 知识库演示导入文件生成。

## V2.4 现场知识验证

现场知识区分为：

- 知识验证：检查治具、异常、质量标准是否支持开工。
- 关联治具：查看当前产品 / 工序治具与点检标准。
- 常见异常：查看 high / critical 异常提醒。
- 质量标准：查看 effective、pending_review、expired 标准。

开工资料检查会联动：

- `field_knowledge_validation`
- `field_fixture_ready`
- `field_quality_ready`

知识库阻塞会影响开工 readiness。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 本机同时启动前端和 API |
| `npm run dev:lan` | 启动局域网平板演示 |
| `npm run demo:assets` | 生成合成演示上传资料 |
| `npm run demo:imports` | 生成 Excel 演示导入文件 |
| `npm run demo:knowledge` | 生成治具 / 异常 / 质量标准演示导入文件 |
| `npm run import-flow:check` | 只读检查导入流程 |
| `npm run maintenance-flow:check` | 只读检查资料维护中心 |
| `npm run auth-flow:check` | 只读检查 Mock 权限 |
| `npm run knowledge-flow:check` | 只读检查现场知识库 |
| `npm run knowledge-validation:check` | 只读检查 V2.4 知识验证 |
| `npm run execution-flow:check` | 只读检查生产执行闭环 |
| `npm run demo:analytics` | 生成现场统计演示快照 |
| `npm run analytics-flow:check` | 只读检查现场统计看板 |
| `npm run full-regression:check` | 只读检查 V2.7 全流程回归完整性 |
| `npm run data-consistency:check` | 只读检查 Mock / metadata 数据一致性 |
| `npm run acceptance:report` | 生成 V2.7 演示验收报告 |
| `npm run demo:check` | 只读检查平板演示准备状态 |
| `npm run demo:release-check` | 只读检查演示版收口状态 |
| `npm run demo:freeze-check` | 只读检查冻结候选状态 |
| `npm run file-flow:check` | 只读检查本地文件资料流 |
| `npm run security:check` | 检查敏感文件和安全闸门 |
| `npm run build` | 构建前端和后端 |
| `npm run check` | 安全检查 + Prisma schema 校验 + 构建 |

## 文档

- `docs/v2.4-knowledge-field-validation.md`
- `docs/v2.7-full-regression-qa.md`
- `docs/release-notes-v2.7.md`
- `docs/sealos-gap-analysis-v2.7.md`
- `docs/api.md`
- `docs/knowledge-library-guide.md`
- `docs/project-status.md`
- `docs/import-template-guide.md`
- `docs/maintenance-guide.md`
- `docs/permission-matrix.md`
- `docs/tablet-install-guide.md`
- `docs/file-flow-design.md`

## 安全注意事项

- 不提交 `.env.local`。
- 不提交真实客户资料。
- 不提交 `apps/api/storage/uploads` 下的真实上传文件。
- 不提交 `apps/api/storage/metadata` 下的本地 metadata JSON。
- 不在代码、文档或日志中写入真实数据库连接串。
- 禁止执行 `db:readonly-check`、`prisma migrate`、`prisma db push`、`prisma db seed`、`prisma:seed:test-db`，除非后续阶段明确授权。

## V2.5 现场执行闭环

V2.5 增加生产执行闭环演示：开工检查、开始生产、过程确认、数量报工、暂停、恢复、异常停线、完工确认、班组交接和现场日报。当前版本仍为 Mock / 本地 metadata 演示，不连接 Sealos，不接企业微信微盘，不接真实语音。

新增只读检查命令：

```bash
npm run execution-flow:check
```

执行闭环本地 metadata 文件已加入 `.gitignore`，不会提交真实现场记录或上传资料。

## V2.6 现场统计看板

V2.6 增加现场统计看板：现场总览、生产执行统计、数量质量统计、质量异常趋势、资料问题排行、文件健康统计、知识库复核统计、趋势图、排行和统计摘要复制。

新增命令：

```bash
npm run demo:analytics
npm run analytics-flow:check
```

当前统计数据仍来自 Mock / 本地 metadata，不接 Sealos、不接企业微信微盘、不接真实语音，不作为正式 BI 系统。

## V2.7 全流程回归候选版

V2.7 增加全流程总验收：系统总览、数据一致性检查、业务链路检查、权限回归检查、演示准备检查和可复制验收报告。入口为“演示工具 -> 全流程总验收”。

新增命令：

```bash
npm run full-regression:check
npm run data-consistency:check
npm run acceptance:report
```

Release Notes：`docs/release-notes-v2.7.md`

Sealos gap analysis：`docs/sealos-gap-analysis-v2.7.md`

当前仍为 Mock / 本地 metadata 演示版，未接 Sealos、企业微信微盘、企业微信登录或真实语音。
