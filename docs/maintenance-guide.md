# 资料维护中心使用说明

资料维护中心用于演示“导入后发现资料不完整或版本不一致时，如何在平板端进行修正、复核和留痕”。它只操作本地 Mock / metadata，不连接真实数据库。

## 打开方式

1. 启动前端和后端。
2. 进入 `/tablet`。
3. 点击顶部“演示工具”。
4. 选择“资料维护中心”。

## 推荐演示顺序

1. 在“概览”查看客户、产品、计划、文件和待复核数量。
2. 在“文件资料”中选择一条待复核或失效资料，修改版本或状态。
3. 点击“设为有效”，模拟将某个资料版本切换为当前有效版本。
4. 在“前段参数”修改端子型号、拉力标准或压接高度。
5. 在“后段资料包”修改连接器型号、孔位图或 SOP 名称。
6. 在“复核队列”处理待复核项。
7. 在“维护历史”查看维护记录。

## 维护记录

每次维护都会生成一条本地记录：

- `maintenanceId`
- `entityType`
- `entityId`
- `action`
- `before`
- `after`
- `reason`
- `operatorId`
- `operatorName`
- `operatorRole`
- `createdAt`

默认演示操作人为：

- `demo-maintainer`
- `资料维护演示账号`
- `资料维护`

## 本地文件

维护历史默认写入：

```text
apps/api/storage/metadata/maintenance-records.json
```

该文件属于本地运行数据，已加入 `.gitignore`，不要提交到 Git，也不要放入真实客户资料。

## 后续接 Sealos 的替换点

后续进入真实数据库阶段时，优先替换：

- `apps/api/src/maintenance/maintenance.service.ts`
- `apps/api/src/storage/local-storage.service.ts` 中与维护历史相关的读写
- `production-plans`、`search`、`feedback`、`imports` 的本地 metadata 数据来源

替换时应先做只读验证，再设计事务写入和审计表，不要直接在演示分支执行 migrate、db push 或 seed。
