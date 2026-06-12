# 线束车间生产计划资料管控系统

面向线束生产车间前段/后段组长的安卓平板 PWA 现场资料管控系统。系统围绕“生产计划 -> 产品资料包 -> 前段/后段资料查询 -> 版本确认 -> 查询留痕 -> 异常反馈”的现场流程建设。

## 当前能力

- 生产计划看板
- 客户产品资料包
- 前段参数查询
- 后段资料查询
- PDF/图片上传与预览
- 资料完整性检查
- 版本红线
- 版本历史
- 审计记录
- 异常反馈
- Mock API
- 后续 Sealos PostgreSQL 预留
- 后续企业微信微盘预留
- 后续语音查询预留

## 技术栈

- Vue 3
- TypeScript
- Vite
- Tailwind CSS
- shadcn-vue
- NestJS
- Prisma
- PostgreSQL 预留

## 项目结构

```text
hanglian
├─ apps
│  ├─ tablet      # 安卓平板/PWA 前端
│  └─ api         # NestJS 后端与 Mock API
├─ docs           # 需求、接口、开发说明和上传指南
├─ scripts        # 本地安全检查脚本
└─ package.json   # monorepo 根脚本
```

## 本地启动

```bash
npm install
npm run dev
npm run dev:tablet
npm run dev:api
```

访问地址：

- 平板端：http://localhost:5173/tablet
- API：http://localhost:3000/api
- Swagger：http://localhost:3000/api/docs

## 当前数据源

- 默认 `DATA_SOURCE=mock`。
- 暂未连接 Sealos PostgreSQL。
- 本地上传文件仅用于开发演示。
- `apps/api/.env.local` 只用于本机，不进入 Git。

## GitHub 上传安全说明

- 不要提交 `.env.local`。
- 不要提交真实客户资料。
- 不要提交真实 PDF/SOP/图纸。
- 不要提交数据库连接串。
- 不要提交企业微信密钥。
- 上传前执行 `npm run security:check`、`npm run build` 和 `npm run check`。

## 常用命令

```bash
npm run dev
npm run build
npm run security:check
npm run prisma:validate
npm run check
```

## 后续计划

- GitHub 版本管理
- UI 优化
- 登录角色
- Sealos 测试库接入
- 企业微信微盘同步
- 语音识别接入
