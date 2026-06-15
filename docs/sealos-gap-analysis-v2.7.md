# Sealos 接入前差距清单 V2.7

## V3.0A 只读验证补充

V3.0A 已将 Sealos 接入前置步骤收敛为测试库只读验证准备：

- `.env.local.example` 保持测试库只读默认安全开关。
- `.env.local` 只在本机准备并被 Git 忽略。
- `db:readonly-check` 只允许在 `DB_TARGET=test`、`ALLOW_TEST_DB_CONNECT=true`、`ALLOW_PRISMA_WRITE=false`、`ALLOW_DESTRUCTIVE_DB_ACTIONS=false` 且连接串不是示例值时执行只读 `SELECT`。
- migration SQL preview 使用本地 schema diff，不连接数据库。
- seed dry-run 只生成本地预览文件，不写库。
- 前端迁移预览弹窗显示 V3.0A 数据库安全状态。

进入 V3.0B 前仍需确认测试库备份、回滚方案、建表窗口和写库授权。

V2.7 仍为 Mock / 本地 metadata 演示版，不连接 Sealos PostgreSQL，不执行真实迁移。

## 当前使用 Mock / metadata 的模块

- 生产计划。
- 客户与产品。
- 文件资料。
- 前段参数。
- 后段资料包。
- 导入记录。
- 维护记录。
- 审计记录。
- 治具库。
- 异常库。
- 质量标准库。
- 执行记录。
- 报工记录。
- 班组交接。
- 统计看板。

## 后续需要迁移到数据库的表

- 用户。
- 客户。
- 产品。
- 生产计划。
- 文件资料。
- 前段参数。
- 后段资料包。
- 导入记录。
- 维护记录。
- 审计记录。
- 治具。
- 异常。
- 质量标准。
- 执行记录。
- 报工记录。
- 交接记录。

## 文件本体策略

文件本体不进入 PostgreSQL。PostgreSQL 只保存文件元数据、版本关系、状态、审计和业务关联。文件本体后续进入对象存储 / 企业微信微盘 / 文件服务。

## Prisma Repository 需要补齐

- 生产计划 Repository 从 Mock 切换到 Prisma。
- 文件资料 Repository 补齐版本组、当前有效、归档和文件健康映射。
- 导入、维护、审计 Repository 补齐真实表写入。
- 知识库 Repository 拆分治具、异常、质量标准。
- 执行闭环 Repository 补齐状态事件、过程确认、报工和交接。
- 统计看板的数据来源改为聚合真实表。

## 迁移顺序建议

1. 只读连接测试。
2. Prisma schema validate / generate。
3. 测试库初始化基础表。
4. 客户、产品、生产计划导入。
5. 文件资料 metadata 导入。
6. 知识库与执行闭环导入。
7. 审计与历史记录导入。
8. 前端数据源切换灰度验证。

## 测试库验证步骤

- 使用 `.env.local` 手动配置测试库连接串。
- 先执行只读验证。
- 再执行迁移 SQL 预览。
- 再执行 dry-run seed。
- 最后在明确授权后进入写库阶段。

## 风险点

- 版本数据和当前有效资料关系。
- 文件路径和存储提供方映射。
- Mock 权限到真实组织权限映射。
- 审计历史完整性。
- 导入历史和回滚预览口径。
