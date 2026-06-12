# 项目状态

当前版本：V1.9 平板演示试用包。

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
- V1.0-V1.3：暖色立体工业平板 UI、预览体验、现场交互和文件健康 API。
- V1.4：演示资料生成、文件流自检、上传体验复测、预览边界提示、现场模式。
- V1.5：LAN API 自动识别、局域网开发脚本、网络诊断面板、现场走查面板、演示准备检查、平板访问文档。
- V1.6：系统信息面板、演示说明面板、演示界面状态重置、走查结果复制、统一空状态/错误状态、演示版 release check。
- V1.7：演示工具菜单、演示数据管理、演示前检查、演示资料说明、后续路线面板、README 截图占位。
- V1.8：冻结前验收面板、Release Notes、合并前检查文档、demo:freeze-check、UI/触控/闭环复核。
- V1.9：PWA 配置、平板安装提示、横屏提示、启动页、PWA / 平板诊断、Windows 一键启动脚本、tablet-install-guide。

## 当前仍为 Mock

- 后端业务数据仍为 Mock / 本地 metadata。
- 文件存储仍为本机 `apps/api/storage/uploads`。
- 企业微信微盘未接入。
- 真实语音识别未接入。
- Sealos PostgreSQL 未连接，未执行写库。
- 网络诊断只做 API / 文件服务只读检查，不做数据库连接。
- 演示状态重置只清理浏览器 UI 状态，不清理后端上传文件或 metadata。
- V1.7 演示数据管理面板只提供说明和前端 UI 状态重置，不做危险清理。
- V1.8 冻结前验收面板只写入本机 localStorage，不连接数据库，不伪造业务通过。
- V1.9 PWA 只预缓存前端静态资源，不离线缓存 API 和文件流。

## 安全状态

- `.env.local` 不提交。
- 上传文件不提交。
- metadata JSON 不提交。
- demo-upload-assets 只包含合成演示文件，可提交用于本地测试。

## 下一步建议

建议用安卓平板按 `docs/tablet-install-guide.md` 完成添加到桌面和横屏访问验证，再按 `docs/tablet-field-test-guide.md` 与应用内“冻结前验收”完整走查 V1.9 平板演示试用包。
