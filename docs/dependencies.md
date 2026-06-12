# 依赖说明

本文档记录项目初始化阶段已安装的工具、插件和依赖。当前仅完成工程初始化与依赖安装，不包含业务功能、真实数据库连接、企业微信微盘接入或语音平台接入。

## 全局开发工具

| 工具 | 用途 | 后续是否可替换 |
| --- | --- | --- |
| `@openai/codex` | 官方 Codex CLI，仅允许使用官方包 | 不建议替换为非官方 Codex 类工具 |
| `@nestjs/cli` | 创建和维护 NestJS API 工程 | 可替换为直接使用本地 Nest CLI 脚本，但当前保留 |

## 根目录依赖

| 依赖 | 用途 | 后续是否可替换 |
| --- | --- | --- |
| `concurrently` | 后续可并行启动前端和后端开发服务 | 可替换为 npm scripts、Turbo、Nx 或 pnpm workspace 脚本 |

## 前端运行依赖

| 依赖 | 用途 | 后续是否可替换 |
| --- | --- | --- |
| `vue` | Vue 3 前端框架 | 不建议替换，已确定为核心栈 |
| `vue-router` | 前端路由 | 可替换，但 Vue 官方方案优先 |
| `pinia` | 前端状态管理 | 可替换为 VueUse/store 或其他状态库 |
| `@vueuse/core` | 常用组合式工具函数 | 可按需移除 |
| `@vueuse/motion` | 后续交互动效能力 | 可替换或按需移除 |
| `zod` | 数据结构校验 | 可替换为 Valibot、Yup 等 |
| `ofetch` | HTTP 请求封装 | 可替换为 Fetch、Axios 等 |
| `fuse.js` | 模糊搜索 | 可替换为服务端搜索、MiniSearch 等 |
| `dayjs` | 日期时间处理 | 可替换为 date-fns、原生 Intl 等 |
| `lucide-vue-next`, `@lucide/vue` | 图标组件 | 可替换为其他图标库 |
| `reka-ui` | shadcn-vue 底层无样式组件能力 | 不建议随意替换，和 shadcn-vue 关联较强 |
| `class-variance-authority`, `clsx`, `tailwind-merge` | shadcn-vue 样式组合工具 | 不建议替换，除非整体替换 UI 方案 |
| `tailwindcss-animate`, `vaul-vue`, `vue-sonner` | shadcn-vue 组件所需动效、抽屉和通知依赖 | 可随组件使用情况调整 |
| `vue-pdf-embed`, `pdfjs-dist` | 后续 PDF 图纸预览 | 可替换为自研 PDF.js 封装或其他 PDF 预览组件 |
| `viewerjs` | 图片 SOP 预览 | 可替换为自研预览器或其他图片查看器 |
| `@tanstack/vue-table` | 后续资料/记录表格能力 | 可替换为其他表格方案 |
| `vee-validate`, `@vee-validate/zod` | 表单校验 | 可替换为 FormKit、原生表单方案等 |
| `echarts`, `vue-echarts` | 后续统计图表 | 可替换为 AntV、Chart.js 等 |
| `@zxing/browser` | 后续扫码能力 | 可替换为平台原生扫码或其他扫码库 |
| `qrcode` | 后续二维码生成 | 可替换为其他二维码库 |

## 前端开发依赖

| 依赖 | 用途 | 后续是否可替换 |
| --- | --- | --- |
| `vite`, `@vitejs/plugin-vue` | Vue 3 + Vite 构建开发环境 | 不建议替换，已确定为核心栈 |
| `typescript`, `vue-tsc`, `@vue/tsconfig` | TypeScript 与 Vue 类型检查 | 不建议替换 |
| `tailwindcss`, `@tailwindcss/vite` | Tailwind CSS 与 Vite 集成 | 可替换为 UnoCSS、CSS Modules 等，但当前保留 |
| `vite-plugin-pwa` | 后续 PWA 能力 | 可替换为自定义 service worker 或其他 PWA 插件 |
| `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-vue`, `@vue/eslint-config-typescript`, `eslint-config-prettier` | 代码规范检查 | 可调整规则，不建议移除 |
| `prettier` | 代码格式化 | 可替换，但当前保留 |
| `@types/node`, `@types/qrcode` | Node 与二维码库类型定义 | 按需保留 |
| `shadcn-vue` CLI | 初始化并生成 shadcn-vue 组件文件 | 可停止使用 CLI，但已生成组件保留在项目内 |

## 后端运行依赖

| 依赖 | 用途 | 后续是否可替换 |
| --- | --- | --- |
| `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` | NestJS API 核心框架 | 不建议替换，已确定为核心栈 |
| `@nestjs/config` | 配置管理 | 可替换为自定义配置加载 |
| `@nestjs/swagger`, `swagger-ui-express` | OpenAPI/Swagger 文档 | 可替换为其他 API 文档方案 |
| `@nestjs/schedule` | 定时任务 | 可替换为 BullMQ、系统 cron 等 |
| `@nestjs/throttler` | 接口限流 | 可替换为网关或反向代理限流 |
| `@nestjs/serve-static` | 静态文件服务能力 | 可替换为 Nginx、对象存储 CDN 等 |
| `class-validator`, `class-transformer` | DTO 校验与转换 | 可替换为 Zod、Valibot 等 |
| `helmet`, `compression`, `cookie-parser` | HTTP 安全头、压缩、Cookie 解析 | 可按部署环境调整 |
| `multer` | 文件上传解析 | 可替换为 Fastify multipart 或对象存储直传 |
| `uuid` | UUID 生成 | 可替换为 Node crypto UUID |
| `@prisma/client`, `@prisma/adapter-pg`, `pg`, `dotenv`, `nestjs-prisma` | Prisma 与 PostgreSQL 集成准备 | 可替换 ORM，但当前按 Prisma + PostgreSQL 保留 |
| `exceljs` | 后续 Excel 导入导出 | 可替换为 SheetJS 等 |
| `sharp` | 后续图片处理 | 可替换为外部图片服务 |
| `pdf-parse` | 后续 PDF 文本解析 | 可替换为独立解析服务 |
| `@nestjs/jwt`, `passport`, `passport-jwt`, `bcryptjs` | 后续认证授权准备 | 可替换为企业 SSO、OIDC 或网关认证 |
| `reflect-metadata`, `rxjs` | NestJS 默认依赖 | 不建议移除 |

## 后端开发依赖

| 依赖 | 用途 | 后续是否可替换 |
| --- | --- | --- |
| `@nestjs/cli`, `@nestjs/schematics`, `@nestjs/testing` | NestJS 脚手架、生成器和测试支持 | 不建议移除 |
| `prisma` | Prisma CLI 与 schema/migration 工具 | 可替换 ORM 时一并替换 |
| `typescript`, `ts-node`, `ts-loader`, `ts-jest`, `tsconfig-paths` | TypeScript 构建和测试 | 不建议移除 |
| `jest`, `supertest`, `source-map-support` | 单元测试和 e2e 测试 | 可替换为 Vitest 等 |
| `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-config-prettier`, `eslint-plugin-prettier`, `prettier`, `globals` | 代码规范和格式化 | 可调整规则，不建议移除 |
| `@types/*` | Node、PostgreSQL、Express、上传、JWT、压缩等类型定义 | 按实际依赖保留 |

## VS Code 插件

`code` 命令当前不可用，因此本次未自动安装 VS Code 插件。后续可在 VS Code 中手动安装以下插件：

| 插件 | 用途 |
| --- | --- |
| `OpenAI.chatgpt` | 官方 OpenAI VS Code 插件 |
| `Vue.volar` | Vue 3 语言支持 |
| `bradlc.vscode-tailwindcss` | Tailwind CSS 智能提示 |
| `dbaeumer.vscode-eslint` | ESLint 集成 |
| `esbenp.prettier-vscode` | Prettier 格式化 |
| `Prisma.prisma` | Prisma schema 支持 |
| `mikestead.dotenv` | `.env` 文件高亮 |
| `EditorConfig.EditorConfig` | EditorConfig 支持 |
| `usernamehw.errorlens` | 行内错误提示 |
| `eamodio.gitlens` | Git 历史辅助 |
| `GitHub.vscode-github-actions` | GitHub Actions 支持 |
| `redhat.vscode-yaml` | YAML 支持 |
| `humao.rest-client` | REST 请求调试 |
| `christian-kohler.path-intellisense` | 路径补全 |
| `PKief.material-icon-theme` | 文件图标主题 |

## 暂时不安装的内容

| 内容 | 暂不安装原因 |
| --- | --- |
| 企业微信微盘 SDK | 涉及企业账号授权、应用凭证、权限范围和真实文件空间 |
| 语音 SDK | 涉及平台账号、密钥、计费和后续独立服务设计 |
| PaddleOCR | 建议后续作为独立 OCR 服务评估，涉及模型、运行环境和算力 |
| 真实 Sealos PostgreSQL 连接 | 涉及真实连接串、账号密码、网络白名单和部署环境 |
| 对象存储 SDK | 涉及存储桶、访问密钥、权限策略和部署环境 |

## 安全约束

- 当前没有写入任何真实密钥。
- 当前没有连接真实 Sealos PostgreSQL。
- 当前没有连接企业微信微盘。
- `apps/api/.env` 中的 `DATABASE_URL` 是占位符，不能直接用于生产或测试环境。
- 禁止使用非官方 Codex UI、Codex Android、Codex WebUI 或其他来历不明的第三方 Codex 插件/工具。
- Codex 相关只允许使用官方 `@openai/codex` 和官方 OpenAI VS Code 插件。
