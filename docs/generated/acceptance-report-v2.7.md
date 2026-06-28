# V2.7 演示验收报告

生成时间：2026/6/15 00:13:53

当前分支：feature/v2-7-full-regression-qa

## 版本

V2.7 全流程回归候选版。

## 已完成模块

- 平板 UI
- 资料查询
- 文件上传预览
- 版本审计
- 数据导入
- 资料维护
- 角色权限
- 知识库
- 知识验证
- 执行闭环
- 班组交接
- 现场日报
- 统计看板
- 演示工具
- 全流程总验收

## 当前未接入项

- 未接 Sealos PostgreSQL。
- 未接企业微信微盘。
- 未接真实企业微信登录。
- 未接真实语音识别。
- 未接真实生产数据。

## 建议检查命令

```bash
npm run full-regression:check
npm run data-consistency:check
npm run analytics-flow:check
npm run execution-flow:check
npm run knowledge-validation:check
npm run knowledge-flow:check
npm run auth-flow:check
npm run maintenance-flow:check
npm run import-flow:check
npm run demo:check
npm run demo:release-check
npm run demo:freeze-check
npm run security:check
npm run build
npm run check
```

## 安全边界

- 不提交 `.env.local`。
- 不提交本地上传文件。
- 不提交 metadata JSON。
- 不写入真实数据库连接串。
- 不接企业微信微盘或真实语音。
- 不执行 migrate / db push / seed / db:readonly-check。

## 下一步建议

1. 路线 A：创建 PR / 合并 main / 打演示 tag。
2. 路线 B：进入 Sealos PostgreSQL 测试库接入准备。
3. 路线 C：规划企业微信微盘授权和文件服务。
4. 路线 D：规划真实语音识别服务。
