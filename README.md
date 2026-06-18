# 线束车间生产计划资料管控系统

## V3.4 主页面细节打磨

V3.4 继续围绕“线束车间资料查询上传中心”优化 `/tablet` 主页面：顶部只保留圆形资料库入口、当前功能搜索、上传资料和订单总览；左侧今日订单/本周订单同时显示；图纸库继续按客户 -> 产品型号 -> 图纸详情 -> 模块详情 -> 大图查看递进。

新增打磨点：
- 订单驱动图纸库：产品型号点击进入图纸详情，完成订单只移除待办，不影响资料。
- 模块内上传：从图纸模块进入时自动绑定客户、产品型号和模块类型；顶部上传仍可手动选择。
- 图纸详情六大模块：原图、SOP 指导书、成品图、辅料规格、注意事项、配套工装固定展示。
- 连接器 / 治具独立搜索：不混入客户产品层级，采用固定表头参数表。
- 删除密码锁文案：本地默认删除密码为 `123`，后端仍只保存 bcrypt hash。

当前仍为 Mock / 本地演示状态，未接 Sealos、企业微信微盘、企业微信真实登录或真实语音识别。

```bash
npm run document-hub-polish:check
npm run document-hub:check
npm run unified-documents:check
npm run security:check
npm run build
npm run check
```

## V3.3 手游式资料库工作台

当前 `/tablet` 主页面已改为“资料库工作台”：不展示登录权限、职位专属 UI、生产执行闭环、统计看板或演示工具。主页面聚焦资料调用、上传补充资料和订单型号快捷打开资料。

核心入口：
- 左上角圆形“资料库”功能入口，可展开图纸库、连接器参数、治具参数。
- 左侧今日/本周订单，点击产品型号直接打开对应图纸资料。
- 右上角保留上传资料和订单总览。
- 图纸库按客户 -> 产品型号 -> 图纸详情 -> 模块详情 -> 大图查看递进。
- 图纸详情固定六大模块：原图、SOP 指导书、成品图、辅料规格、注意事项、配套工装。
- 当前本地默认删除密码为 `123`，后端仅保存 bcrypt hash。

当前仍是 Mock / 本地演示状态，未接 Sealos、企业微信微盘、企业微信真实登录或真实语音识别。

```bash
npm run document-hub:check
npm run unified-documents:check
npm run security:check
npm run build
npm run check
```

## V3.3 主界面二次精简

当前 `/tablet` 主页面已调整为三栏“线束车间资料查询上传中心”：左侧筛选与回收站，中间查询、上传和资料列表，右侧资料预览与详情操作。主页面不再展示生产计划、登录权限、职位专属 UI、演示工具、现场执行、统计看板、Mock 权限、API 在线或未接 Sealos 等无关状态信息。

保留能力：
- 上传资料入口保持突出。
- 资料查询、预览、编辑、版本状态、设为当前有效保留。
- 回收站入口保留，并以主列表方式查看已删除资料。
- 删除密码锁保留，彻底删除仍需密码保护。

当前仍未接 Sealos、企业微信微盘、企业微信真实登录或真实语音识别；未执行数据库连接或写库操作。

```bash
npm run custom-main-layout:check
npm run unified-documents:check
npm run security:check
npm run build
npm run check
```

## V3.2 统一资料查询上传中心

当前主线已调整为“线束车间资料查询上传中心”。`/tablet` 主页面不再默认展示登录、角色切换、岗位专属入口、演示工具、现场模式、生产执行闭环或统计看板，而是集中提供资料查询、上传、预览、编辑、版本管理、回收站和删除密码锁。

新增能力：

- 统一资料搜索：图纸、SOP、孔位图、成品图、连接器、治具、异常案例、质量标准统一查询。
- 本地资料上传：PDF / JPG / PNG / WEBP，最大 30MB。
- 资料编辑：客户、产品、资料类型、版本、状态、关键词和备注。
- 回收站：软删除、恢复、彻底删除。
- 删除密码锁：后端 bcrypt hash，本地 metadata，前端不保存明文密码。
- 批量管理：批量移入回收站、批量恢复、批量彻底删除。

当前仍未接 Sealos 数据库、企业微信微盘、企业微信真实登录或真实语音。

常用检查命令：

```bash
npm run unified-documents:check
npm run security:check
npm run build
npm run check
```

## V3.1 清理演示假数据与定制开发基线

当前默认进入定制开发基线模式，暂时不做现场试运行，暂时不接 Sealos 数据库、企业微信微盘或真实语音。系统默认不加载业务演示数据，等待用户提供真实界面和功能修改需求。

默认数据模式：

```env
DEMO_DATA_MODE=empty
VITE_DEMO_DATA_MODE=empty
```

常用命令：

```bash
npm run demo:clean:dry
npm run demo:clean
npm run custom-baseline:check
npm run build
npm run check
```

后续定制需求模板：`docs/custom-requirements-template.md`。

## V3.1 系统配置能力保留说明

系统配置中心、工位配置、显示配置、公告通知、使用反馈和检查面板能力保留，但现场试运行方向已暂停。当前重点是清理演示假数据，进入干净的定制开发基线。

常用检查命令：

```bash
npm run settings-flow:check
npm run field-pilot:check
npm run build
npm run check
```

平板入口：

- 演示工具 -> 系统配置中心
- 演示工具 -> 使用反馈
- 演示工具 -> 试运行检查
- 顶部试运行公告

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
## V3.10 storage cloud alignment

V3.10 adds a backend storage adapter layer. Uploaded files now go through `StorageService` with local storage as the default provider. S3/Object Storage support is prepared but disabled until a real provider is selected.

- Current default: `FILE_STORAGE_PROVIDER=local`.
- Future Sealos volume target: `/data/hanglian`.
- New safe status endpoint: `GET /api/storage/status`.
- New document routes: `/api/files/documents/:documentId/preview` and `/api/files/documents/:documentId/download`.
- Database, Sealos PostgreSQL, WeCom Drive, and real voice integration remain paused.

Useful local checks:

```bash
npm run storage-flow:check
npm run cloud-alignment:check
npm run storage:legacy-scan
```
# V3.12 image build validation and deployment dry run

V3.12 prepares GitHub Actions image validation for API and Tablet without deploying to Sealos. The workflow is manual and also limited to push events on `feature/v3-12-image-build-validation`.

Useful checks:

```bash
npm run image-build:check
npm run sealos:deploy-dry-run
```

This stage does not connect to PostgreSQL, does not run migration or seed, does not connect S3, and does not modify Sealos.

# V3.11 Sealos persistent runtime preparation

V3.11 prepares split API and Tablet container deployment while keeping database and S3 integration paused. API runtime defaults to Mock data plus local storage at the future Sealos volume path `/data/hanglian`; Tablet reads its API endpoint from startup-generated `runtime-config.js`; GitHub image builds are manual only.

Useful checks:

```bash
npm run cloud:runtime-preflight
npm run runtime-config:check
npm run storage:mount-check -w api
```

Do not run database connection, migration, db push, or seed commands in this stage.
