# 线束车间生产计划资料管控系统

面向线束车间前段/后段组长的安卓平板 PWA 原型。系统围绕“生产计划 → 产品资料包 → 前段/后段资料查询 → 版本确认 → 查询留痕 → 异常反馈”的现场流程建设。

## 当前版本

V1.1 已完成暖色立体工业平板 UI 重构：

- 前端通过后端 Mock API 获取计划、资料、搜索、确认、反馈数据。
- 后端仍为 NestJS Mock / 本地文件原型，不连接真实 Sealos PostgreSQL。
- 平板端采用 PrimeVue + Tailwind CSS + GSAP + AutoAnimate + Embla Carousel。
- UI 改为暖色车间控制台风格，突出大按钮、立体卡片、清晰分区、资料红线。

## 技术栈

- Monorepo：npm workspaces
- 前端：Vue 3、TypeScript、Vite、Tailwind CSS、PrimeVue、shadcn-vue、Pinia、Vue Router
- UI/动效：PrimeVue、primeicons、tailwindcss-primeui、GSAP、@formkit/auto-animate、embla-carousel-vue、lucide-vue-next
- 后端：NestJS、TypeScript、Prisma、PostgreSQL 规划模型
- 文档：docs

## 项目结构

```text
hanglian
├─ apps
│  ├─ tablet      # 安卓平板/PWA 前端
│  └─ api         # NestJS 后端 Mock API
├─ docs           # 需求、接口、数据模型、安全和 UI 文档
├─ scripts        # 本地安全检查脚本
└─ package.json   # monorepo 根脚本
```

## 本地启动

```bash
npm install
npm run dev
```

常用地址：

- 平板端：http://localhost:5173/tablet
- API：http://localhost:3000/api
- Swagger：http://localhost:3000/api/docs

也可以分别启动：

```bash
npm run dev:tablet
npm run dev:api
```

## 常用检查

```bash
npm run security:check
npm run build
npm run check
```

## 安全边界

- 不提交 `.env.local`。
- 不提交真实 `DATABASE_URL`。
- 不提交真实客户资料、真实 PDF/SOP/图纸。
- 不提交企业微信密钥、语音平台密钥、token、secret、password、private key。
- 当前不连接 Sealos PostgreSQL，不执行 migrate/db push/seed。
- 当前不连接企业微信微盘，不连接真实语音识别平台。

## 相关文档

- `docs/v1.1-warm-3d-ui.md`：V1.1 UI 重构说明
- `docs/ui-guide.md`：平板端 UI 风格指南
- `docs/api.md`：Mock API 说明
- `docs/data-model.md`：Prisma 数据模型规划
- `docs/security-policy.md`：安全提交与敏感文件规则

