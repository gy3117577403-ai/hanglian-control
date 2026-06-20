# V3.14 PostgreSQL 接入准备说明

本阶段只完成图纸业务 Prisma 数据模型草案。没有连接数据库，没有建表，没有迁移，没有 seed，也没有切换运行数据源。

## 当前状态

- 后端运行数据源仍为 Mock / JSON metadata。
- 图纸客户、产品、模块、资料、PDF 导入和删除锁仍由本地 JSON metadata 驱动。
- 文件本体仍在本地持久化卷或未来挂载卷中，数据库只保存文件索引字段。
- Prisma schema 已具备 V3.15 PostgreSQL 测试库接入所需的主要模型、关系、唯一约束和索引。
- 当前不启用 Prisma Repository 写入，不执行数据库连接检查。

## 已定稿模型

| 接入顺序 | 模型 | 目的 |
| --- | --- | --- |
| 1 | `Customer` | 承载图纸客户基础信息、软删除状态和 PDF 导入批次关系。 |
| 2 | `Product` | 承载客户下产品型号，使用 `customerId + normalizedProductModel` 保证同客户型号唯一。 |
| 3 | `ProductModule` | 承载每个产品固定六个图纸模块和封面资料索引。 |
| 4 | `ProductDocument` | 承载正式资料 metadata、文件索引、软删除生命周期和预览字段。 |
| 5 | `PdfImportBatch` | 承载 PDF 导入批次状态、计数和应用摘要。 |
| 6 | `PdfImportItem` | 承载 PDF 导入条目、临时文件 key、解析确认和应用结果。 |
| 7 | `AuditLog` | 承载客户、产品、资料、PDF 导入和删除生命周期审计。 |
| 8 | `DeleteLockSetting` | 承载删除锁 hash、失败次数和锁定状态。 |

## V3.15 建议接入顺序

1. 只使用测试库，禁止直接连接生产或真实客户库。
2. 先基于 JSON metadata 生成 dry-run 迁移报告。
3. 回填 `Customer`，校验客户数量、重复名称和软删除状态。
4. 回填 `Product`，先生成 `normalizedProductModel`，再校验同客户型号唯一性。
5. 回填 `ProductModule`，确保每个产品拥有六个固定模块。
6. 回填 `ProductDocument`，先回填 `moduleKey/documentStatus/deleted`，再补 `moduleId/checksumSha256`。
7. 回填 `PdfImportBatch` 和 `PdfImportItem`，保留批次审计历史。
8. 回填 `AuditLog`，只迁移安全审计字段，不迁移密码、密钥或绝对路径。
9. 回填 `DeleteLockSetting`，只迁移 bcrypt `passwordHash` 和锁定状态。
10. 运行只读一致性检查，通过后再考虑让 Repository 读取测试库。

## 迁移前必须回填

| 字段 | 来源 | 用途 |
| --- | --- | --- |
| `normalizedProductModel` | `productModel` 经 NFKC、trim、连续空格合并和大小写规范化后生成 | 支撑 `customerId + normalizedProductModel` 唯一约束。 |
| `moduleKey` | 现有六模块 JSON key | 支撑旧 JSON 与数据库并行迁移。 |
| `moduleId` | `ProductModule.id` | 建立资料到模块的正式外键。 |
| `documentStatus` | 现有资料状态或生命周期状态 | 支撑资料状态筛选。 |
| `deleted` | `deletedAt` 是否存在 | 支撑回收站和普通列表过滤。 |
| `checksumSha256` | 文件校验或导入校验结果 | 支撑重复资料和重复导入识别。 |

## 数据一致性检查

- 客户数量：`drawing-customers.json` 与 `Customer` 数量一致。
- 产品数量：`drawing-products.json` 与 `Product` 数量一致，排除软删除时也要分别计数。
- 模块数量：每个产品必须有六个 `ProductModule`。
- 资料数量：`documents.json` 与 `ProductDocument` 数量一致，软删除资料单独计数。
- PDF 导入数量：`drawing-import-records.json` 与 `PdfImportBatch/PdfImportItem` 数量一致。
- 审计数量：`audit-logs.json` 与 `AuditLog` 数量一致。
- 删除锁：`delete-lock-settings.json` 与 `DeleteLockSetting` 单例一致。

## 重复数据处理

### 重复产品

- 同一客户下使用 `normalizedProductModel` 判断重复。
- dry-run 阶段输出重复列表，不自动合并。
- 若历史数据存在重复，先由人工确认保留、合并或软删除策略。
- 未处理重复前不得启用 `@@unique([customerId, normalizedProductModel])` 的真实迁移。

### 重复 checksum

- `ProductDocument` 的重复 checksum 不做全局唯一。
- 同一产品同一模块下的重复 checksum 先记录为候选重复资料。
- PDF 导入条目可按 checksum 判断跳过、补版本或人工确认。
- 真实文件不存在时不得仅凭 metadata 创建有效资料。

## 文件存在性检查

- 数据库只保存 `storageProvider/storageKey/storedFileName/originalFileName/mimeType/fileSize/checksumSha256`。
- 迁移 dry-run 必须检查 `storageKey` 指向的本地持久化卷文件是否存在。
- 缺失文件只标记为 `documentStatus = missing` 或迁移告警，不伪造文件。
- PDF、图片和其他二进制文件不得写入 PostgreSQL。

## 删除锁 hash 迁移

- 只迁移 bcrypt hash 到 `DeleteLockSetting.passwordHash`。
- 不迁移、不生成、不记录明文密码。
- 初始默认密码仍由应用层生成 bcrypt hash，schema 中不写明文默认值。
- API 永远不返回 `passwordHash`。

## 安全闸门

- V3.15 只允许测试库。
- 禁止直接迁移真实客户数据。
- 禁止执行未审阅的 migration。
- 禁止跳过 dry-run、计数对照和 checksum 对照。
- 禁止把 `.env.local`、上传文件、metadata 运行 JSON、PDF、图片或密钥提交到 Git。
- 正式切换前必须保留 JSON 只读备份和回退能力。

## 本阶段未执行事项

- 未连接 PostgreSQL。
- 未执行 Prisma migrate。
- 未执行 Prisma db push。
- 未执行 Prisma seed。
- 未执行任何 SQL。
- 未创建新的 migration 目录或 migration.sql。
- 未修改 Sealos。
- 未连接 S3 或企业微信微盘。
