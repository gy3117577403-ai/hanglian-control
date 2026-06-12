# 开发说明

## 当前阶段

当前进入 V0.9：GitHub 上传前工程整理、安全检查和 CI 准备。

数据库接入线已暂停。当前目标是完成软件功能沉淀、工程结构整理、安全检查脚本和 GitHub CI 准备，不连接 Sealos PostgreSQL。

## 数据源状态

- 前端默认通过后端 API 获取数据。
- 后端当前默认仍使用 Mock 数据和本地 metadata。
- `DATA_SOURCE` 默认保持为 `mock`。
- Sealos 后续通过环境变量接入。
- GitHub 仓库不保存真实密钥、真实数据库连接串和真实客户资料。

## 当前仍为 Mock 的内容

- 生产计划基础数据。
- 客户与产品资料包。
- 前段/后段资料查询结果。
- 查询留痕。
- 异常反馈。
- 资料版本管理中的核心业务数据源。
- 企业微信微盘同步。
- 真实语音识别。

## 本地文件与 metadata

- 本地上传文件仅用于开发演示。
- 上传文件目录：`apps/api/storage/uploads`。
- 本地资料 metadata：`apps/api/storage/metadata/documents.json`。
- 本地审计记录：`apps/api/storage/metadata/audit-logs.json`。
- 以上本地生成文件不应进入 Git。

## 允许的本地检查

```bash
npm run security:check
npm run prisma:format
npm run prisma:validate
npm run prisma:generate
npm run build
npm run check
```

## 禁止操作

- 不连接真实 Sealos 数据库。
- 不执行只读数据库连接检查，除非用户后续明确恢复该阶段。
- 不执行 Prisma migrate。
- 不执行 Prisma db push。
- 不执行 Prisma db seed。
- 不执行测试库 seed 写入。
- 不连接真实企业微信微盘。
- 不连接真实语音识别平台。
- 不提交真实密钥、真实客户资料和真实图纸。

## 后续接入建议

- GitHub 上传后先通过 CI 验证构建和安全检查。
- 准备测试库连接串后，再恢复 Sealos 只读验证。
- 数据库写入能力必须经过独立审批和测试库验证。
- 企业微信微盘授权、语音识别和对象存储建议拆成独立阶段开发。
