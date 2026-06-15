# 项目状态

## V3.3 手游式资料库入口 + 订单驱动图纸库

- 当前分支：`feature/v3-3-game-doc-hub-orders`。
- `/tablet` 主页面已改为现场资料调用工作台，不做登录权限、职位专属 UI、复杂后台筛选、生产执行闭环或统计看板。
- 新增圆形“资料库”功能入口，展开图纸库、连接器参数、治具参数三项功能。
- 新增今日/本周订单侧栏，点击产品型号直接打开对应图纸详情；完成订单后从待办列表移除，并进入订单总览已完成列表。
- 新增图纸库客户 -> 产品型号 -> 图纸详情 -> 模块详情 -> 大图查看层级。
- 图纸详情固定六大模块：原图、SOP 指导书、成品图、辅料规格、注意事项、配套工装。
- 新增连接器参数和治具参数独立搜索模块。
- 上传资料保留，并支持从图纸模块内上传时自动绑定客户、产品型号和模块类型。
- 当前本地默认删除密码为 `123`，后端只保存 bcrypt hash，不保存明文密码。
- 当前仍是 Mock / 本地演示状态，未接 Sealos、企业微信微盘、企业微信真实登录或真实语音。
- 禁止执行 migrate、db push、db seed、db:readonly-check 和任何数据库写库操作。

## V3.3 主界面二次精简

- 当前分支：`feature/v3-3-custom-main-document-layout`。
- `/tablet` 主页面已改为三栏统一资料中心：左侧筛选与回收站，中间查询/上传/资料列表，右侧预览/详情/版本操作。
- 主页面已隐藏生产计划、登录权限、职位专属 UI、演示工具、现场模式、现场执行闭环和统计看板。
- 上传资料入口、资料预览、资料编辑、设为当前有效、回收站、恢复、彻底删除和删除密码锁保留。
- 本阶段只做前端主界面布局收敛、文档和只读检查脚本，不接 Sealos、不接企业微信微盘、不接真实语音。
- 禁止执行 migrate、db push、db seed、db:readonly-check 和任何数据库写库操作。

## V3.2 统一资料查询上传中心

- 当前分支：`feature/v3-2-unified-query-upload-delete-lock`。
- 主页面改为统一资料查询上传中心，不再要求登录。
- 暂时取消主页面角色、职位专属入口、演示工具、现场模式、执行闭环和统计看板主流程展示。
- 新增统一资料搜索、上传、预览、编辑、版本历史、设为当前有效。
- 新增回收站、软删除、恢复、彻底删除和批量删除。
- 新增删除密码锁，后端保存 bcrypt hash，前端不保存明文密码。
- 删除锁 metadata 已加入 `.gitignore`。
- 当前仍未接 Sealos、企业微信微盘、企业微信真实登录或真实语音。
- 禁止执行 migrate、db push、db seed、db:readonly-check 和任何数据库写库操作。

## V3.1 定制开发基线

- 当前分支：`feature/v3-1-clean-custom-baseline`。
- 已暂停现场试运行配置方向。
- 已暂停 Sealos 数据库接入线。
- 已清理演示数据、演示生成目录、本地上传演示文件和 metadata 运行数据。
- 已进入定制开发基线，等待用户提供真实界面和功能修改需求。
- 默认 `DEMO_DATA_MODE=empty`，不加载业务演示 seed。
- 保留全部功能代码、API 模块、脚本、Prisma schema 和文档能力。
- 当前仍未接 Sealos、企业微信微盘、企业微信真实登录或真实语音。
- 禁止执行 migrate、db push、db seed、db:readonly-check 和任何写库操作。

## V3.1 系统配置能力（历史保留）

- 当前分支：`feature/v3-1-system-settings-field-pilot`。
- 新增系统配置中心。
- 新增字典配置、工位配置、显示配置。
- 新增公告通知和使用反馈闭环。
- 新增现场试运行检查。
- 新增本地配置审计记录。
- 新增 `settings-flow:check` 和 `field-pilot:check`。
- 当前仍未接 Sealos、企业微信微盘、企业微信真实登录或真实语音。
- 禁止执行 migrate、db push、db seed、db:readonly-check 和任何写库操作。

## V3.0A 进展

- 当前分支：`feature/v3-0a-sealos-readonly-check`。
- 目标：准备 Sealos PostgreSQL 测试库只读验证。
- 当前仍为 Mock / 本地 metadata 数据源。
- `.env.local` 仅本机使用，不提交 Git。
- 只读验证命令：`npm run db:readonly-check -w api`。
- 本地预览命令：`npm run prisma:migration:sql-preview -w api`、`npm run prisma:seed:dry-run -w api`。
- 新增检查命令：`npm run sealos:readonly-check`、`npm run sealos:readonly-report`。
- 禁止执行 migrate、db push、db seed、真实 seed 和任何写库操作。

下一步：用户在本机 `apps/api/.env.local` 填写 Sealos PostgreSQL 测试库连接串后，可重新执行 V3.0A 只读验证；只读验证通过后再进入 V3.0B。

当前版本：V2.7 全流程回归候选版。

## 已完成

- V0.1：平板端生产计划资料管控原型。
- V0.2：前端优先走后端 Mock API。
- V0.3：上传、预览、查询留痕、异常反馈基础流程。
- V0.4：数据库接入准备，不连接真实数据库。
- V0.5：本地文件资料管理。
- V0.6：资料版本管理、审计、metadata。
- V0.7：Prisma Repository 草稿、迁移预览、seed dry-run。
- V0.8A：Sealos PostgreSQL 测试库只读验证准备。
- V0.9：本地安全基线提交。
- V1.0-V1.8：暖色立体工业平板 UI、演示流程、冻结检查和现场 QA。
- V1.9：PWA 配置、平板安装提示、横屏提示和诊断。
- V2.0：数据导入中心、Excel/CSV 预览校验、模板下载、导入历史。
- V2.1：资料维护中心、复核队列、维护历史。
- V2.2：本地 Mock 角色与权限。
- V2.3：治具库、异常库、质量标准库、现场知识页签和搜索联动。
- V2.4：知识库现场验证、开工检查联动、知识库批量维护、复核队列知识问题、导入预览增强。
- V2.5：生产执行闭环、班组交接和现场日报。
- V2.6：现场统计看板、统计摘要和 analytics Mock API。
- V2.7：全流程回归、数据一致性校验、演示版总验收和 Sealos 差距清单。

## V2.7 完成内容

- 新增后端 `system-qa` 只读总验收 API。
- 新增前端“全流程总验收”面板。
- 新增数据一致性、业务链路、权限回归、演示准备和验收报告聚合。
- 新增 `full-regression:check`、`data-consistency:check`、`acceptance:report`。
- 新增 V2.7 Release Notes 与 Sealos 接入前差距清单。
- 当前仍未连接 Sealos、企业微信微盘、企业微信登录或真实语音。

## 当前仍为 Mock

- 后端业务数据仍为 Mock seed / 本地 metadata。
- 文件存储仍为本机 `apps/api/storage/uploads`。
- 企业微信微盘未接入。
- 企业微信登录未接入。
- 真实语音识别未接入。
- Sealos PostgreSQL 未连接，未执行写库。
- 网络诊断只做 API / 文件服务只读检查，不做数据库连接。

## 安全状态

- `.env.local` 不提交。
- 本地上传文件不提交。
- metadata JSON 不提交。
- 真实 DATABASE_URL 不写入代码、文档或日志。
- 本阶段禁止执行 `db:readonly-check`、`prisma migrate`、`prisma db push`、`prisma db seed`、`prisma:seed:test-db`。

## 下一步建议

完成全流程总验收后，可选择路线 A 创建 PR / 合并 main / 打演示 tag，或路线 B 进入 Sealos PostgreSQL 测试库只读接入准备。
