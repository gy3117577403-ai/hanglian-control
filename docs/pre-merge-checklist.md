# 合并前检查清单

## 必须执行

```bash
npm run demo:release-check
npm run demo:check
npm run file-flow:check
npm run security:check
npm run build
npm run check
```

V1.8 冻结候选版还建议执行：

```bash
npm run demo:freeze-check
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

`feat: release V1.8 tablet field demo candidate`

## 合并建议

1. 先创建 PR。
2. CI 通过。
3. 安卓平板人工验收。
4. Squash and merge。
5. 打 tag：`v1.8-demo-candidate`。
