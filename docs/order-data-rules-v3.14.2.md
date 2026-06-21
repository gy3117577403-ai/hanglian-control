# V3.14.2 订单数据规则

1. 订单只支持 `today` 和 `week` 两个范围，默认查询本周进行中订单。
2. 生产图纸状态只支持 `front`、`back`、`no_drawing`。
3. 完成状态只支持 `pending` 和 `completed`，完成订单不删除。
4. 订单来源只支持 `excel_import`、`manual_create`、`seed`。
5. Excel 导入只读取“产品型号”一列，不读取客户、数量、状态、日期、备注或产品名称。
6. Excel 只支持 `.xlsx`，文件内重复型号仅第一条作为可创建项。
7. Excel 导入没有数量时必须保持 `quantity=null` 且 `quantityProvided=false`，不得伪造成 1。
8. 产品匹配只按规范化后的产品型号精确匹配，不做模糊匹配，也不自动创建客户或产品。
9. 同型号只匹配到一个有效产品时自动绑定；多个客户同型号时保持歧义，需要人工确认。
10. 未建档产品允许导入订单，但 `linkedProductId=null` 且生产图纸状态为 `no_drawing`。
11. 只有绑定产品且存在未删除原图时，订单才能处于 `front` 或 `back`。
12. 原图上传、PDF Apply、删除、恢复和彻底删除后统一由 `OrderStatusSyncService` 同步订单状态；同步失败只返回 warning，不回滚文件操作。
