# V3.0A Sealos PostgreSQL 只读验证报告

生成时间：2026-06-15T00:21:50.185Z

## 安全结论

- 本报告脚本不连接数据库。
- 本报告不打印完整 DATABASE_URL。
- 当前阶段只允许测试库只读连通验证和本地 dry-run / SQL preview。
- 禁止 migrate、db push、db seed、prisma:seed:test-db 和任何写库操作。

## 检查项

| 项目 | 状态 |
| --- | --- |
| 当前分支 | feature/v3-0a-sealos-readonly-check |
| 阶段 | V3.0A Sealos PostgreSQL 测试库只读验证准备 |
| .env.local | 已准备，本地忽略文件 |
| DATABASE_URL | 示例值，未连接 |
| DATABASE_URL 脱敏 | 示例连接串 |
| DB_TARGET | test |
| ALLOW_TEST_DB_CONNECT | true |
| ALLOW_PRISMA_WRITE | false |
| ALLOW_DESTRUCTIVE_DB_ACTIONS | false |
| 迁移 SQL 预览产物 | 已生成，本地忽略 |
| seed dry-run 产物 | 已生成，本地忽略 |
| 数据库写库操作 | 未执行，V3.0A 禁止 |
| migrate / db push / db seed | 未执行，V3.0A 禁止 |

## 本阶段命令

```bash
npm run db:readonly-check -w api
npx prisma format --schema=apps/api/prisma/schema.prisma
npx prisma validate --schema=apps/api/prisma/schema.prisma
npx prisma generate --schema=apps/api/prisma/schema.prisma
npm run migration:validate -w api
npm run migration:preview -w api
npm run prisma:seed:dry-run -w api
npm run prisma:migration:sql-preview -w api
npm run sealos:readonly-check
npm run sealos:readonly-report
npm run security:check
npm run build
npm run check
```

## 下一步

如果真实测试库连接串已在本机 `.env.local` 配置且只读验证通过，可以进入 V3.0B 测试库建表准备；否则先由用户在本机文件中补充测试库连接串，不要把连接串发到聊天窗口。

