# 权限矩阵

V2.2 权限为本地 Mock RBAC，用于演示平板端菜单、按钮和后端 Mock API 守卫。后续接真实组织时，可替换为企业微信组织用户与后端数据库权限表。

| 角色 | 用户 ID | 主要权限 |
| --- | --- | --- |
| 前段组长 | `mock-front-leader` | 查看计划、查看前段参数、确认计划、异常反馈、查看资料与留痕、系统诊断 |
| 后段组长 | `mock-back-leader` | 查看计划、查看后段资料、确认计划、异常反馈、查看资料与留痕、系统诊断 |
| 资料维护 | `mock-maintainer` | 上传资料、维护资料、设为有效、归档、导入预览与应用、维护中心、复核队列 |
| 工艺 | `mock-process-engineer` | 维护前段参数、后段资料包、资料版本、复核队列、上传资料 |
| 品质 | `mock-quality` | 查看全部计划、查看资料留痕、处理复核队列、系统诊断 |
| 管理员 | `mock-admin` | 全部 Mock 权限 |

## V2.3 知识库权限

| 权限 | 用途 |
| --- | --- |
| `knowledge.fixture.view` | 查看治具库 |
| `knowledge.fixture.create` | 新增治具资料 |
| `knowledge.fixture.update` | 维护治具资料和状态 |
| `knowledge.abnormal.view` | 查看异常库 |
| `knowledge.abnormal.create` | 新增异常案例 |
| `knowledge.abnormal.update` | 维护异常案例和状态 |
| `knowledge.quality.view` | 查看质量标准库 |
| `knowledge.quality.create` | 新增质量标准 |
| `knowledge.quality.update` | 维护质量标准和状态 |
| `knowledge.history.view` | 查看知识库维护历史 |

角色默认分配：

- 前段组长、后段组长：查看治具库、异常库、质量标准库。
- 资料维护：知识库全部查看、新增、维护、历史。
- 工艺：查看/维护三类知识库，查看历史。
- 品质：查看治具库，查看/维护异常库和质量标准库，查看历史。
- 管理员：全部 Mock 权限。

## 后端守卫

| 接口 | 权限 |
| --- | --- |
| `POST /api/production-plans/:id/confirm` | `plan.confirm` |
| `POST /api/feedback` | `plan.feedback` |
| `POST /api/documents/upload` | `document.upload` |
| `PATCH /api/documents/:id/status` | `document.update` |
| `PATCH /api/documents/:id/version` | `document.update` |
| `POST /api/documents/:id/set-effective` | `document.set_effective` |
| `POST /api/documents/:id/archive` | `document.archive` |
| `POST /api/imports/:type/apply` | `import.apply` |
| `PATCH /api/maintenance/customers/:id` | `maintenance.customer.update` |
| `PATCH /api/maintenance/products/:id` | `maintenance.product.update` |
| `PATCH /api/maintenance/production-plans/:id` | `maintenance.plan.update` |
| `PATCH /api/maintenance/front-parameters/:id` | `maintenance.parameter.update` |
| `PATCH /api/maintenance/back-packages/:id` | `maintenance.package.update` |
| `PATCH /api/maintenance/documents/:id` | `maintenance.document.update` |
| `POST /api/maintenance/review-queue/:id/resolve` | `maintenance.review.resolve` |
| `POST /api/knowledge/fixtures` | `knowledge.fixture.create` |
| `PATCH /api/knowledge/fixtures/:id` | `knowledge.fixture.update` |
| `POST /api/knowledge/abnormal-cases` | `knowledge.abnormal.create` |
| `PATCH /api/knowledge/abnormal-cases/:id` | `knowledge.abnormal.update` |
| `POST /api/knowledge/quality-standards` | `knowledge.quality.create` |
| `PATCH /api/knowledge/quality-standards/:id` | `knowledge.quality.update` |
| `GET /api/knowledge/history` | `knowledge.history.view` |

无权限时后端返回 `403`，提示：`当前角色无权执行该操作。`

## V2.5 执行闭环权限

| 权限 | 用途 |
| --- | --- |
| `execution.view` | 查看生产执行面板、执行计划和时间线 |
| `execution.start` | 开工检查和开始生产 |
| `execution.pause` | 暂停生产 |
| `execution.resume` | 恢复生产 |
| `execution.exception_hold` | 异常停线 |
| `execution.complete` | 完工确认 |
| `execution.quantity_report` | 数量报工 |
| `execution.process_confirm` | 首件、巡检、复核等过程确认 |
| `execution.handover` | 班组交接 |
| `execution.daily_report.view` | 查看现场日报 |

| 接口 | 权限 |
| --- | --- |
| `GET /api/execution/summary` | `execution.view` |
| `GET /api/execution/plans` | `execution.view` |
| `GET /api/execution/plans/:planId` | `execution.view` |
| `POST /api/execution/plans/:planId/prepare-start` | `execution.start` |
| `POST /api/execution/plans/:planId/start` | `execution.start` |
| `POST /api/execution/plans/:planId/process-confirm` | `execution.process_confirm` |
| `POST /api/execution/plans/:planId/quantity-report` | `execution.quantity_report` |
| `POST /api/execution/plans/:planId/pause` | `execution.pause` |
| `POST /api/execution/plans/:planId/resume` | `execution.resume` |
| `POST /api/execution/plans/:planId/exception-hold` | `execution.exception_hold` |
| `POST /api/execution/plans/:planId/complete` | `execution.complete` |
| `POST /api/execution/shift-handover` | `execution.handover` |
| `GET /api/execution/daily-report` | `execution.daily_report.view` |
