# 安卓平板现场测试指南

V1.9 面向同一局域网内的安卓平板横屏演示试用包。当前仍是 Mock / 本地文件原型，不连接 Sealos PostgreSQL，不接企业微信微盘，不接真实语音平台。

## 启动方式

在电脑项目根目录执行：

```bash
npm run demo:assets
npm run pwa:assets
npm run pwa:check
npm run demo:check
npm run demo:release-check
npm run dev:lan
```

`dev:lan` 会同时启动前端和 API，并在终端输出可供平板访问的地址：

- 平板前端：`http://<电脑IPv4>:5173/tablet`
- API：`http://<电脑IPv4>:3000/api`
- Swagger：`http://<电脑IPv4>:3000/api/docs`

如果平板打不开，请先确认电脑和平板在同一 Wi-Fi 或同一网段，并允许 Node.js 通过 Windows 防火墙。

## 前端 API 地址规则

平板端默认使用自动识别：

- 如果配置了 `VITE_API_BASE_URL`，优先使用配置值。
- 如果从 `localhost` 打开前端，API 使用 `http://localhost:3000/api`。
- 如果从局域网 IP 或主机名打开前端，API 使用 `http://<当前主机名>:3000/api`。

现场演示一般不需要设置 `.env`。如果手动设置了 `VITE_API_BASE_URL=http://localhost:3000/api`，平板访问时会连到平板自己的 localhost，通常会失败。

## 网络诊断

在顶部状态栏点击“网络诊断”：

- 查看访问模式：本机 / 局域网平板访问。
- 查看当前前端地址和实际 API Base URL。
- 检查 `/api/health` 和 `/api/system/ping`。
- 查看 API 延迟。
- 查看当前数据源，默认应为 Mock。
- 检查 `/api/documents/file-health` 文件健康接口。
- 查看 `/api/files/<storedFileName>` 文件流提示。
- 复制 API 地址、复制平板地址、打开 Swagger。

如果前端是 HTTPS、API 是 HTTP，面板会提示混合内容风险。本地现场演示建议统一使用 HTTP 局域网地址。

## V1.9 演示工具

顶部状态栏新增“演示工具”菜单：

- 系统信息：查看版本、运行模式、访问地址、安全状态和常用命令。
- 演示说明：按四步讲解启动演示、选择计划、查看资料、上传与追溯。
- 安装到平板桌面：查看 PWA 安装状态和浏览器添加到主屏幕说明。
- 网络诊断：检查局域网访问、API、文件健康和 Swagger。
- PWA / 平板诊断：检查 HTTPS、Service Worker、standalone、横竖屏和屏幕尺寸。
- 现场走查：按 17 项手动验收。
- 演示数据管理：查看 Mock、本地上传、metadata、localStorage 等演示数据边界。
- 演示前检查：从前端检查可检测项，并提示演示前需要执行的命令。
- 冻结前验收：按视觉与触控、生产计划、资料与预览、版本与追溯、演示工具、安全边界做冻结前人工勾选。
- 演示资料说明：查看 `demo-upload-assets` 合成资料和推荐上传顺序。
- 后续路线：选择继续 UI、合并 main、接 Sealos 测试库或接企业微信微盘。

“现场模式”仍是顶部独立按钮。

## V1.6 演示说明

顶部状态栏新增“系统信息”和“演示说明”：

- 系统信息：查看版本、运行模式、访问地址、安全状态和常用命令。
- 演示说明：按四步讲解启动演示、选择计划、查看资料、上传与追溯。
- 两个面板均明确标注当前是演示版和 Mock 数据源。

## 现场走查

在顶部状态栏点击“现场走查”，按 17 项手动勾选：

1. 选择今日计划
2. 锁定产品
3. 查看资料完整度
4. 切换前段
5. 切换后段
6. 打开图纸预览
7. 打开 SOP / 孔位图 / 成品图
8. 上传演示 PDF
9. 上传演示图片
10. 检查文件健康
11. 查看版本历史
12. 设为当前有效
13. 查看审计留痕
14. 组长确认
15. 异常反馈
16. 开启现场模式
17. 网络诊断通过

走查结果只保存在本机浏览器 `localStorage`，不会写入数据库，也不会伪造业务通过状态。

V1.6 支持“复制走查结果”。如果浏览器阻止自动复制，面板会显示文本框，供手动复制。

V1.9 支持从“演示工具”菜单进入走查，不改变走查项目和保存方式。冻结前验收结果也只保存在本机浏览器 `localStorage`，不会写入数据库。

## 演示状态重置

可在“系统信息”或现场走查流程中重置演示界面状态。该操作只清理本机浏览器 UI 状态：

- 现场走查勾选状态。
- 现场模式开关。
- 最近查询记录。
- 当前 scope、选中计划和当前页签。

不会删除上传资料、审计记录、metadata、本地文件或任何数据库内容。

V1.9 也可从“演示工具 → 演示数据管理”或“演示工具 → 重置演示界面状态”执行同样的前端 UI 状态重置。该操作仍不删除后端文件和 metadata。

## 添加到桌面

V1.9 支持从“演示工具 → 安装到平板桌面”查看安装入口。局域网 HTTP 演示环境可能只支持添加快捷方式；完整 PWA 安装建议后续使用 HTTPS 部署环境。

## 演示文件

上传测试请只选择 `demo-upload-assets` 下的合成文件：

- `demo-drawing-rev-a.pdf`
- `demo-drawing-rev-b.pdf`
- `demo-sop-step-01.png`
- `demo-pinout-16p.png`
- `demo-finished-detail.png`

不要上传真实客户资料、真实图纸、真实 SOP 或量产文件。

## 禁止事项

- 不执行 `db:readonly-check`。
- 不执行 `prisma migrate`、`prisma db push`、`prisma db seed`。
- 不连接 Sealos PostgreSQL。
- 不接企业微信微盘。
- 不接真实语音平台。
- 不提交 `.env.local`、本地上传文件或 metadata JSON。
