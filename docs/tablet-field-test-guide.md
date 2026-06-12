# 安卓平板现场测试指南

V1.5 面向同一局域网内的安卓平板横屏演示。当前仍是 Mock / 本地文件原型，不连接 Sealos PostgreSQL，不接企业微信微盘，不接真实语音平台。

## 启动方式

在电脑项目根目录执行：

```bash
npm run demo:assets
npm run demo:check
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

如果前端是 HTTPS、API 是 HTTP，面板会提示混合内容风险。V1.5 本地现场演示建议统一使用 HTTP 局域网地址。

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
