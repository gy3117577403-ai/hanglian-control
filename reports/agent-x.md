# Agent X 报告

## 状态

已完成。订单、客户、产品、资料分类相关 API 已在独立 worktree/branch 中实现并验证；未修改 `main/master`。

## 分支

- Worktree: `C:\Users\31175\Desktop\hanglian-agent-d-core-api`
- Branch: `agent-d-core-api`
- Base: `main`

## commit

- 当前 HEAD: `8d7e6930ad75fe53fe3c6ba9a080f550004be440`
- 说明: 本任务尚未创建新 commit，当前改动仍在 working tree 中。

## 修改文件

- `apps/api/src/app.module.ts`
- `apps/api/src/common/types/production.types.ts`
- `apps/api/src/documents/documents.service.ts`
- `apps/api/src/documents/dto/document-query.dto.ts`
- `apps/api/src/mock/mock-store.ts`
- `apps/api/src/products/products.controller.ts`
- `apps/api/src/products/products.service.ts`
- `apps/api/src/repositories/interfaces/production-plan.repository.interface.ts`
- `apps/api/src/repositories/mock/mock-document.repository.ts`
- `apps/api/src/repositories/mock/mock-production-plan.repository.ts`
- `apps/api/src/repositories/prisma/prisma-document.repository.ts`
- `apps/api/src/repositories/prisma/prisma-production-plan.repository.ts`

## 新增文件

- `apps/api/src/customers/customers.controller.ts`
- `apps/api/src/customers/customers.module.ts`
- `apps/api/src/customers/customers.service.ts`
- `apps/api/src/customers/dto/create-customer.dto.ts`
- `apps/api/src/customers/dto/update-customer.dto.ts`
- `apps/api/src/documents/document-categories.ts`
- `apps/api/src/orders/orders.controller.ts`
- `apps/api/src/orders/orders.module.ts`
- `apps/api/src/orders/orders.service.ts`
- `apps/api/src/orders/dto/complete-order.dto.ts`
- `apps/api/src/orders/dto/update-order-production-status.dto.ts`
- `apps/api/src/products/dto/create-product.dto.ts`
- `apps/api/src/products/dto/update-product.dto.ts`
- `reports/agent-d-core-api-核心接口整理.md`
- `reports/agent-x.md`

## 新增接口

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

## 资料分类

- `original_drawing`: 原图
- `sop`: SOP 指导书
- `finished_image`: 成品图
- `auxiliary_spec`: 辅料规格
- `notice`: 注意事项
- `tooling`: 配套工装

## 数据库变化

- 未修改 Prisma schema。
- 未新增 migration。
- 未新增表或字段。
- Prisma 模式下复用现有 `Customer`、`Product`、`ProductionPlan`、`ProductDocument` 表。
- 删除接口采用现有软删除字段：`deletedAt`，产品同时将 `isActive` 置为 `false`。
- Mock 模式下新增/删除客户、产品仅作用于进程内 mock store。

## 环境变量

- 未新增环境变量。
- 继续沿用现有配置：
  - `API_PREFIX`: 默认 `api`
  - `PORT`: 默认 `3000`
  - `DATABASE_URL`: Prisma 模式使用
  - 数据源与数据库安全相关变量沿用现有 `data-source.config` / `database-safety` 逻辑

## 测试命令

- `npm install`
- `npm run build -w api`
- `npm test -w api -- --runInBand`
- 使用编译后 Nest 应用加 supertest 探测新增 API 路径。

## 测试结果

- `npm run build -w api`: 通过。
- supertest 探测通过：
  - `GET /api/orders/today`: 200，返回 4 条 mock 今日订单。
  - `GET /api/orders/week`: 200，返回 10 条 mock 本周订单。
  - `PATCH /api/orders/:id/production-status`: 200，支持 `status` 和 `productionStatus`。
  - `PATCH /api/orders/:id/complete`: 200。
  - 客户 CRUD: 200/201。
  - 产品 CRUD: 200/201。
  - `GET /api/products/PRD-4821A/documents`: 200，返回 6 个固定资料分类。
  - `GET /api/documents?...&category=original_drawing`: 200，返回项带 `category: original_drawing`。
- `npm test -w api -- --runInBand`: 未通过，失败在现有 Jest/TypeScript 配置，未进入业务断言。

## 阻塞问题

- 仓库现有 Jest 配置在当前 TypeScript 版本下报错：
  - `TS5011`: common source directory/rootDir 配置问题。
  - `TS5101`: `baseUrl` 已弃用，需要配置 `ignoreDeprecations` 或调整 TS 配置。
- 该阻塞不影响 `npm run build -w api` 和手动 API 探测。

## 集成建议

- ArkTS 订单侧边栏优先调用 `GET /api/orders/today`，需要跨日/周视图时调用 `GET /api/orders/week` 或 `GET /api/orders?scope=week`。
- ArkTS 产品资料页优先调用 `GET /api/products/:id/documents`，直接使用 `categories` 渲染 6 类资料卡片。
- 如果只需要筛选后的资料列表，调用 `GET /api/documents?customerId=&productId=&orderId=&category=`。
- 订单状态更新推荐使用 `{ "productionStatus": "生产中" }`，后端同时兼容 `{ "status": "生产中" }`。
- 合并前建议先修复 Jest/TS 配置，再补 e2e 自动化测试覆盖新增 API。
