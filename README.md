# 线束车间生产计划资料管控系统

面向线束车间前段/后段组长的安卓平板 PWA 原型。系统围绕“生产计划 → 产品资料包 → 前段/后段查询 → 文件预览 → 版本确认 → 查询留痕 → 异常反馈”构建。

## 当前版本

V1.9 平板演示试用包：在 V1.8 演示冻结候选版基础上新增 PWA 配置、平板安装提示、横屏提示、启动页、PWA 诊断和 Windows 一键启动脚本。

当前运行边界：

- 数据源：Mock。
- Sealos PostgreSQL：未接入。
- 企业微信微盘：未接入。
- 真实语音识别：未接入。
- 文件资料：本地开发存储 + 本地上传/预览。

## 推荐启动方式

本机开发：

```bash
npm install
npm run dev
```

- 前端：http://localhost:5173/tablet
- API：http://localhost:3000/api
- Swagger：http://localhost:3000/api/docs

平板局域网演示：

```bash
npm run demo:assets
npm run pwa:assets
npm run pwa:check
npm run demo:check
npm run demo:freeze-check
npm run demo:release-check
npm run dev:lan
```

平板浏览器访问终端输出的 `http://<电脑IPv4>:5173/tablet`。电脑和平板需要在同一 Wi-Fi 或同一网段。

Windows 一键启动：

```text
start-field-demo.bat
```

或：

```powershell
.\start-field-demo.ps1
```

## 演示流程

1. 生成演示资料：`npm run demo:assets`
2. 启动局域网演示：`npm run dev:lan`
3. 平板访问 `/tablet`
4. 选择今日/本周生产计划
5. 查看前段参数、后段资料、图纸/SOP/孔位图/成品图
6. 上传 `demo-upload-assets` 下的 PDF 或图片演示资料
7. 查看文件健康、版本历史和审计记录
8. 打开“演示工具”：系统信息、演示说明、网络诊断、现场走查、演示数据管理、演示前检查、冻结前验收、演示资料说明、后续路线
9. 打开“安装到平板桌面”或“PWA / 平板诊断”，按浏览器能力添加到主屏幕
10. 复制现场走查结果，必要时仅重置前端演示界面状态

## 安卓平板添加到桌面

可以在“演示工具 → 安装到平板桌面”查看安装状态和手动说明。局域网 HTTP 演示环境可能只支持添加桌面快捷方式，完整 PWA 安装建议后续使用 HTTPS 部署环境。

## 演示界面截图占位

截图暂不提交真实客户资料。后续可在演示机使用合成资料截屏，并放入 `docs/screenshots/`：

| 截图 | 建议文件名 | 说明 |
| --- | --- | --- |
| 平板主界面 | `docs/screenshots/v1.7-tablet-dashboard.png` | 1280x800 或 1366x768 横屏 |
| 演示工具菜单 | `docs/screenshots/v1.7-demo-tools-menu.png` | 展示全部演示工具入口 |
| 演示数据管理 | `docs/screenshots/v1.7-demo-data-manager.png` | 展示安全边界和重置说明 |
| 演示前检查 | `docs/screenshots/v1.7-demo-readiness.png` | 展示演示前状态检查 |
| 资料预览与上传 | `docs/screenshots/v1.7-document-preview-upload.png` | 只使用 `demo-upload-assets` 合成资料 |

## 安全注意事项

- 不提交 `.env.local`。
- 不提交真实客户资料。
- 不提交 `apps/api/storage/uploads` 下的真实上传文件。
- 不提交 `apps/api/storage/metadata` 下的本地 metadata JSON。
- 不在代码、文档或日志中写入真实数据库连接串。
- 禁止执行 `db:readonly-check`、`prisma migrate`、`prisma db push`、`prisma db seed` 或真实写库操作，除非后续阶段明确授权。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 本机同时启动前端和 API |
| `npm run dev:lan` | 启动局域网平板演示 |
| `npm run pwa:assets` | 生成 PWA 本地演示图标 |
| `npm run pwa:check` | 只读检查 PWA / 平板演示准备状态 |
| `npm run demo:assets` | 生成合成演示上传资料 |
| `npm run demo:check` | 只读检查平板演示准备状态 |
| `npm run demo:release-check` | 只读检查当前演示版收口状态 |
| `npm run demo:freeze-check` | 只读检查当前冻结候选和平板试用包状态 |
| `npm run file-flow:check` | 只读检查本地文件资料流 |
| `npm run security:check` | 检查敏感文件和安全闸门 |
| `npm run build` | 构建前端和后端 |
| `npm run check` | 安全检查 + Prisma schema 校验 + 构建 |

## 技术栈

- Monorepo：npm workspaces
- 前端：Vue 3、TypeScript、Vite、Tailwind CSS、PrimeVue、Pinia、Vue Router
- 后端：NestJS、TypeScript、Prisma 模型规划
- 文件预览：vue-pdf-embed、pdfjs-dist、viewerjs

## 文档

- `docs/release-notes-v1.8.md`
- `docs/pre-merge-checklist.md`
- `docs/tablet-install-guide.md`
- `docs/v1.9-pwa-tablet-package.md`
- `docs/v1.8-demo-freeze-qa.md`
- `docs/v1.7-demo-management.md`
- `docs/v1.6-demo-release-polish.md`
- `docs/v1.5-tablet-field-qa.md`
- `docs/tablet-field-test-guide.md`
- `docs/file-flow-design.md`
- `docs/api.md`
- `docs/ui-guide.md`
- `docs/project-status.md`
