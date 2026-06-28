# 真实资料本地测试指南

当前阶段仍然不接 Sealos、不接企业微信微盘、不接真实语音。真实资料只允许用于本机上传链路测试，不允许提交到 Git。

## 推荐顺序

```bash
npm run real-data:status:empty
npm run real-data:preflight
# 在平板页面手动上传真实测试资料
npm run real-data:postcheck:strict
npm run real-data:cleanup:dry
# 确认 dry-run 报告无误后再执行
npm run real-data:cleanup
npm run real-data:status:empty
npm run security:check
```

## 隐私规则

`real-data:status`、`real-data:postcheck`、`real-data:cleanup:dry` 生成的报告都采用隐私安全输出：不写入真实客户名称、产品型号、资料标题、上传文件名或完整路径，只保留短指纹和数量，避免测试报告变成敏感资料。

## 命令说明

- `real-data:status`：只读检查当前本机上传沙盒状态。
- `real-data:status:empty`：只读检查沙盒是否为空，适合真实资料测试前执行。
- `real-data:preflight`：执行演示上传、主界面交互、生产预览、安全、构建和性能预检。
- `real-data:postcheck:strict`：真实资料手动上传后，只读验证至少存在一条资料记录，且文件、metadata、审计记录健康。
- `real-data:cleanup:dry`：只生成清理计划，不删除文件。
- `real-data:cleanup`：确认 dry-run 报告无误后，清理带 `HL_REAL_DATA_TEST` 或自动化 sandbox 标记的本机测试资料。

## 禁止事项

- 不提交 `apps/api/.env.local`。
- 不提交 `apps/api/storage/uploads` 下的真实文件。
- 不提交 `apps/api/storage/metadata/*.json` 运行数据。
- 不把真实 `DATABASE_URL`、企业微信 secret、语音平台 key 写入聊天、文档或代码。
- 不执行数据库连接、migrate、db push、seed 或任何写库操作。
