# 线束车间生产计划资料管控系统

面向线束车间前段/后段组长的安卓平板 PWA 原型。系统围绕“生产计划 → 产品资料包 → 前段/后段查询 → 文件预览 → 版本确认 → 查询留痕 → 异常反馈”构建。

## 当前版本

V1.4：本地文件上传体验复测、文件预览边界用例、现场模式和文件流自检。

## 启动

```bash
npm install
npm run dev
```

- 前端：http://localhost:5173/tablet
- API：http://localhost:3000/api
- Swagger：http://localhost:3000/api/docs

## 常用命令

```bash
npm run demo:assets
npm run file-flow:check
npm run security:check
npm run build
npm run check
```

## 当前边界

- 不连接 Sealos PostgreSQL。
- 不执行 migrate、db push、seed、db:readonly-check。
- 不接企业微信微盘。
- 不接真实语音识别。
- 不提交 `.env.local`、真实客户资料、本地上传文件和 metadata JSON。

## 技术栈

- Monorepo：npm workspaces
- 前端：Vue 3、TypeScript、Vite、Tailwind CSS、PrimeVue、Pinia、Vue Router
- 后端：NestJS、TypeScript、Prisma 模型规划
- 文件预览：vue-pdf-embed、pdfjs-dist、viewerjs

## 文档

- `docs/v1.4-upload-preview-qa.md`
- `docs/file-flow-design.md`
- `docs/api.md`
- `docs/ui-guide.md`
- `docs/project-status.md`
