# Agent D Core API 任务报告

## 基本信息

- Worktree: `C:\Users\31175\Desktop\hanglian-agent-d-core-api`
- Branch: `agent-d-core-api`
- Base branch/commit: `main` / `8d7e693`
- 目标: 为 HarmonyOS ArkTS 平板端整理订单、客户、产品、资料分类接口，保留旧接口并新增稳定 API。

## 完成内容

- 新增 `orders` 模块，提供 ArkTS 订单侧边栏所需接口。
- 新增 `customers` 模块，提供客户列表和基础 CRUD。
- 扩展 `products` 模块，保留旧 `GET /api/products/:productCode`，新增产品列表、CRUD、按产品查询 6 类资料。
- 扩展 `documents` 查询，支持 `customerId`、`productId`、`orderId`、`category` 参数。
- 新增固定资料分类映射：
  - `original_drawing`: 原图
  - `sop`: SOP 指导书
  - `finished_image`: 成品图
  - `auxiliary_spec`: 辅料规格
  - `notice`: 注意事项
  - `tooling`: 配套工装

## 接口覆盖

- `GET /api/orders/today`
- `GET /api/orders/week`
- `GET /api/orders`
- `GET /api/orders/:id`
- `PATCH /api/orders/:id/production-status`
- `PATCH /api/orders/:id/complete`
- `GET /api/customers`
- `POST /api/customers`
- `PATCH /api/customers/:id`
- `DELETE /api/customers/:id`
- `GET /api/products`
- `POST /api/products`
- `PATCH /api/products/:id`
- `DELETE /api/products/:id`
- `GET /api/products/:id/documents`
- `GET /api/documents?customerId=&productId=&orderId=&category=`

## ArkTS 响应示例

### 订单侧边栏

```json
{
  "id": "PLN-20260611-001",
  "date": "2026-06-11",
  "customer": "华东新能源",
  "productId": "PRD-4821A",
  "productCode": "HL-EV-4821A",
  "productName": "电池包高压采样线束",
  "plannedQuantity": 1200,
  "completedQuantity": 420,
  "status": "生产中",
  "materialCompleteness": 100
}
```

### 产品资料 6 类

```json
{
  "productId": "PRD-4821A",
  "productCode": "HL-EV-4821A",
  "productName": "电池包高压采样线束",
  "categories": [
    { "category": "original_drawing", "label": "原图", "documents": [] },
    { "category": "sop", "label": "SOP 指导书", "documents": [] },
    { "category": "finished_image", "label": "成品图", "documents": [] },
    { "category": "auxiliary_spec", "label": "辅料规格", "documents": [] },
    { "category": "notice", "label": "注意事项", "documents": [] },
    { "category": "tooling", "label": "配套工装", "documents": [] }
  ]
}
```

### 订单状态更新

```json
{ "status": "生产中" }
```

兼容 ArkTS 别名：

```json
{ "productionStatus": "生产中" }
```

## 关键改动文件

- `apps/api/src/orders/*`
- `apps/api/src/customers/*`
- `apps/api/src/products/*`
- `apps/api/src/documents/document-categories.ts`
- `apps/api/src/documents/documents.service.ts`
- `apps/api/src/documents/dto/document-query.dto.ts`
- `apps/api/src/repositories/interfaces/production-plan.repository.interface.ts`
- `apps/api/src/repositories/mock/*production-plan*`
- `apps/api/src/repositories/mock/mock-document.repository.ts`
- `apps/api/src/repositories/prisma/*production-plan*`
- `apps/api/src/repositories/prisma/prisma-document.repository.ts`

## 验证结果

- `npm run build -w api`: 通过。
- 编译后 Nest 应用 supertest 探测通过：
  - 今日订单 4 条。
  - 本周订单 10 条。
  - 产品资料返回 6 个固定分类。
  - `GET /api/documents?...&category=original_drawing` 返回 `category: original_drawing`。
  - 客户、产品 CRUD 路径返回 200/201。
- `npm test -w api -- --runInBand`: 未通过，失败原因是仓库现有 Jest/TypeScript 配置问题 `TS5011`、`TS5101`，未进入业务断言。

## 备注

- 未修改 `main/master`。
- 未新建独立项目。
- 未删除现有接口或功能。
- 旧产品详情接口 `GET /api/products/:productCode` 已保留。
