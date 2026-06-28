# Release Notes V1.8

## 版本名称

V1.8 演示冻结候选版：线束车间平板现场演示冻结候选版。

## 基于 V1.7 的变化

- 版本标识升级为 V1.8 演示冻结候选版。
- 新增“冻结前验收”面板，支持本机手动勾选、进度保存、复制结果和重置。
- 新增 `demo:freeze-check` 只读冻结检查脚本。
- 新增合并前检查文档和 Release Notes。
- 统一演示检查、冻结检查、README 和项目状态文案。
- 复核暖色立体工业平板风，去除明显黑色遮罩残留。

## 已完成能力清单

- 生产计划选择、今日/本周切换、当前产品锁定。
- 前段参数、后段资料、图纸/SOP/孔位图/成品图预览。
- 本地文件上传、PDF/图片预览、不可预览兜底提示。
- 文件健康、版本历史、当前有效版本、审计记录。
- 组长确认、异常反馈、查询记录。
- 系统信息、演示说明、网络诊断、现场走查。
- 演示数据管理、演示前检查、演示资料说明、后续路线选择。
- 冻结前验收清单。

## 当前明确未完成

- 未接 Sealos。
- 未接企业微信微盘。
- 未接真实语音。
- 未做生产权限。
- 未做真实生产数据。

## 演示启动方法

```bash
npm run demo:assets
npm run demo:check
npm run demo:freeze-check
npm run dev:lan
```

## 平板访问方法

平板与电脑连接同一 Wi-Fi 或同一网段后，访问终端输出的：

- `http://<电脑IPv4>:5173/tablet`
- API：`http://<电脑IPv4>:3000/api`
- Swagger：`http://<电脑IPv4>:3000/api/docs`

## 安全注意事项

- 不提交 `.env.local`。
- 不提交真实客户资料。
- 不提交 `apps/api/storage/uploads` 下的真实文件。
- 不提交 `apps/api/storage/metadata` 下的本地 metadata JSON。
- 不在代码、文档或日志中写入真实数据库连接串。
- 不执行数据库连接、写库、migrate、db push 或 seed。

## 推荐验收流程

1. 执行 `npm run demo:assets` 生成合成演示资料。
2. 执行 `npm run demo:release-check`、`npm run demo:freeze-check`、`npm run build`、`npm run check`。
3. 使用安卓平板横屏访问 `/tablet`。
4. 按“现场走查”和“冻结前验收”逐项手动勾选。
5. 复制验收结果，保存到验收记录中。

## 后续建议

- 方案 A：创建 PR / 合并 main / 打 tag：`v1.8-demo-candidate`。
- 方案 B：继续 UI 微调。
- 方案 C：接 Sealos 测试库。
- 方案 D：接企业微信微盘。
