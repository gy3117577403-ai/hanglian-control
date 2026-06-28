# 合并前检查清单

## 必须执行

```bash
npm run full-regression:check
npm run data-consistency:check
npm run acceptance:report
npm run analytics-flow:check
npm run execution-flow:check
npm run knowledge-validation:check
npm run knowledge-flow:check
npm run auth-flow:check
npm run maintenance-flow:check
npm run import-flow:check
npm run demo:release-check
npm run demo:freeze-check
npm run demo:check
npm run file-flow:check
npm run security:check
npm run build
npm run check
```

如果 PWA 能力已存在，还建议执行：

```bash
npm run pwa:check
```

## 必须确认没有敏感内容

- 无 `.env.local`。
- 无真实客户资料。
- 无 `uploads` 真实文件。
- 无 metadata JSON。
- 无真实数据库连接串。
- 无企业微信 secret。
- 无语音平台 key。

## 必须确认没有数据库动作

- 未执行数据库连接。
- 未执行写库。
- 未执行 migrate / db push / seed。
- 未执行 `db:readonly-check`。
- 未执行 `prisma:seed:test-db`。

## PR 建议标题

`feat: release V2.7 full regression demo candidate`

## 合并建议

1. 先创建 PR。
2. CI 通过。
3. 安卓平板人工验收。
4. Squash and merge。
5. 打 tag：`v2.7-full-regression-candidate`。
