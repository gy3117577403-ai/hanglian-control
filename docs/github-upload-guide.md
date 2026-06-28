# GitHub 上传指南

本文档用于把本项目安全上传到 GitHub 前的本地检查和操作说明。当前阶段只准备工程，不要求现在必须 push。

## 上传前检查清单

- 确认 `.env.local` 没有被 Git 跟踪。
- 确认没有真实客户资料、真实 PDF、真实 SOP、真实图纸准备提交。
- 确认没有数据库连接串、企业微信密钥或其他账号凭据准备提交。
- 确认 `apps/api/storage/uploads` 中没有真实生产资料准备提交。
- 确认 `apps/api/storage/metadata/documents.json` 和 `apps/api/storage/metadata/audit-logs.json` 没有被 Git 跟踪。
- 确认本地构建通过。

## 本地检查命令

```bash
npm run security:check
npm run demo:release-check
npm run build
npm run check
```

`npm run demo:release-check` 建议在推送演示分支前执行，用于确认 README、V1.8 演示冻结文档、平板演示文档、演示检查脚本、忽略规则、版本配置和 GitHub Actions CI 都已准备好。`npm run demo:freeze-check` 用于冻结候选版专项检查。`npm run check` 会依次执行安全检查、Prisma schema 校验和项目构建。

README 中的截图路径目前是占位说明。后续如果添加截图，只允许使用合成演示资料，不允许截入真实客户图纸、真实 SOP、数据库连接串或任何账号密钥。

## V1.8 分支推送和 PR 前建议

推送 `feature/v1-8-demo-freeze-qa` 前建议执行：

```bash
npm run demo:release-check
npm run demo:check
npm run file-flow:check
npm run demo:freeze-check
npm run security:check
npm run build
npm run check
```

PR 标题建议：`feat: release V1.8 tablet field demo candidate`。

合并 main 前建议先创建 PR、等待 CI 通过、完成人工平板验收，再 Squash and merge。合并后可打 tag：`v1.8-demo-candidate`。

## 禁止提交的文件

- `.env`
- `.env.local`
- `apps/api/.env`
- `apps/api/.env.local`
- 真实客户资料
- 真实 PDF/SOP/图纸
- 真实上传文件
- 本地审计记录和本地资料 metadata
- 数据库连接串
- 企业微信密钥
- 私钥和证书文件

## 创建 GitHub 仓库

可以在 GitHub 网站上创建一个空仓库。建议先不要勾选自动生成 README、license 或 gitignore，避免和本地文件冲突。

## 添加远程仓库

创建远程仓库后，在本地执行类似命令：

```bash
git remote add origin <你的 GitHub 仓库地址>
```

添加前可以先查看：

```bash
git remote -v
```

## 首次提交

提交前先检查：

```bash
git status --short
npm run check
```

确认没有敏感文件后，再执行：

```bash
git add .
git commit -m "chore: prepare project for github"
```

## Push

首次推送可使用：

```bash
git push -u origin main
```

如果本地默认分支不是 `main`，可先按团队约定调整分支名。

## 为什么不要提交 .env.local

`.env.local` 是本机开发配置文件，后续可能包含测试库连接串、第三方授权信息或其他敏感配置。它只应该保存在本机或受控部署环境中，不应该进入 GitHub 仓库。

## 后续使用 GitHub Secrets

后续需要 CI/CD 或部署平台读取敏感配置时，可以在 GitHub 仓库的 Secrets 中保存 `DATABASE_URL` 等环境变量。代码仓库只保存 `.env.example` 或 `.env.local.example` 这类示例文件。

## 后续从 GitHub 接 Sealos 部署

后续可将 GitHub 仓库连接到 Sealos 或其他部署平台，由部署环境注入数据库连接串和运行时配置。部署流程应先在测试环境验证，再进入生产环境。
