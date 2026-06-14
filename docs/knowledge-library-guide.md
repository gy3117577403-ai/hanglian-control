# 现场知识库使用说明

## 三类知识

- 治具库：治具编号、名称、类型、适用工位、使用方法、点检标准、保养周期、状态。
- 异常库：异常编号、标题、工位、类别、现象、原因、处理方法、预防措施、严重度、状态。
- 质量标准库：标准编号、标题、检验项目、标准值、公差、检验方法、抽检规则、缺陷等级、状态。

## 平板使用

组长进入 `/tablet` 后选择生产计划，系统会在资料预览下方显示“现场知识库”。切换前段/后段后，知识库自动按当前工序过滤。

## 维护使用

资料维护、工艺、品质或管理员可打开“资料维护中心 → 现场知识库”：

- 治具库支持新增、维护、设为待复核或启用。
- 异常库支持新增、维护和关闭异常案例。
- 质量标准库支持新增、维护和设为有效。
- 维护记录写入本地 `knowledge-records.json`，并生成审计留痕。

## 导入使用

执行：

```bash
npm run demo:knowledge
```

会生成：

- `demo-knowledge-files/demo-fixtures.xlsx`
- `demo-knowledge-files/demo-abnormal-cases.xlsx`
- `demo-knowledge-files/demo-quality-standards.xlsx`

在导入中心选择对应类型后上传、预览、应用。应用只写入本地 Mock metadata，不连接数据库。

## 后续接真实服务

后续接 Sealos PostgreSQL 时，可替换 `KnowledgeService` 的数据来源为 Prisma Repository，并把本地 metadata 迁入正式表。企业微信微盘资料仍需独立授权和文件映射，不在 V2.3 范围。

