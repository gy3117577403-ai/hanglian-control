# Agent I ArkTS Integration Report

## 1. 合并来源

- 基线分支：`backend-integration-mvp` (`1b369ae`)
- Agent E：`agent-e-arkts-base` (`c611a8c`) 登录、Splash、认证服务基础
- Agent F：`agent-f-arkts-workbench` (`3aff099`) 主工作台布局、订单侧栏、资料卡片和工作台 API 模型
- Agent G：`agent-g-arkts-upload-preview` (`a01cb76`) 上传弹窗、文件选择、拍照、上传、预览、下载、刷新总线
- Agent H：`agent-h-arkts-extra-pages` (`24393d3`) 客户产品、连接器参数库、回收站、订单总览和 mock fallback
- Agent J：`agent-j-backend-extra-api` (`08ce9a0`) 已按接口路径优先接入；接口不可用时 H 页面保留 mock fallback

## 2. 冲突文件和处理方式

- `harmony-pad/entry/src/main/ets/pages/WorkbenchPage.ets`
  - 以 H 的登录态/退出登录/页面入口为壳。
  - 合入 F 的顶部搜索栏、订单侧栏、今日/本周订单、资料分类卡片。
  - 接入 G 的 `UploadDocumentDialog`、`DocumentPreviewPage` 和 `WorkbenchRefreshBus`。
- `harmony-pad/entry/src/main/ets/services/AppConfig.ets`
  - 统一为唯一配置入口。
  - `API_BASE_URL` 默认值为 `https://sealos-api.example.com/api`。
  - 保留 `API_PREFIX` 和 `ENABLE_MOCK_FALLBACK`。
- `harmony-pad/entry/src/main/ets/services/ApiClient.ets`
  - 合并 H 的登录 refresh-on-401 和 G 的 URL 拼接/accessToken query 工具。
  - JSON API 请求统一带 `Authorization: Bearer <accessToken>`。
- `harmony-pad/entry/src/main/ets/services/TokenStorageService.ets`
  - 保留唯一 token 存储。
  - 持久化 `accessToken`、`refreshToken`、`userInfo`，并镜像 cached access token 给图片 URL 使用。
- `harmony-pad/entry/src/main/ets/services/WorkbenchApi.ets`
  - 移除 F 的 `config/ApiConfig.ets` 依赖。
  - 改为统一走 `ApiClient` 和 `/orders/*`、`/products/:id/documents`。
- `harmony-pad/entry/src/main/ets/components/UploadDocumentDialog.ets`
  - 保留 G 的完整上传实现，删除 F 的旧占位弹窗。
  - 新增可选 `planId` 透传。
- 命名冲突处理：
  - F 的工作台 `ProductionOrder` 重命名为 `WorkbenchOrder`，避免与 H 的订单总览领域模型重名。

## 3. 最终 harmony-pad 页面清单

- `SplashPage`
- `LoginPage`
- `WorkbenchPage`
- `DocumentPreviewPage`
- `OrderOverviewPage`
- `CustomerProductPage`
- `ConnectorParamPage`
- `RecycleBinPage`

## 4. 最终 service 清单

- `ApiClient`
- `AppConfig`
- `AuthService`
- `TokenStorageService`
- `WorkbenchApi`
- `WorkbenchRefreshBus`
- `CatalogService`
- `UploadService`
- `FilePickerService`
- `CameraService`
- `DocumentPreviewService`
- `DownloadService`
- `CustomerProductService`
- `ConnectorParamService`
- `RecycleBinService`
- `OrderService`
- `DomainModels`
- `MockData`

## 5. 最终 API_BASE_URL 配置位置

- `harmony-pad/entry/src/main/ets/services/AppConfig.ets`
- 默认值：`https://sealos-api.example.com/api`
- 所有 JSON service 均通过 `ApiClient`/`AppConfig` 解析 base URL。
- 未保留 `config/ApiConfig.ets` 和第二套 base URL 配置。

## 6. 登录流程是否可用

- 已集成用户名、密码、登录按钮。
- `POST /auth/login` 成功后保存 `accessToken`、`refreshToken`、`userInfo`。
- `GET /auth/me` 能通过 `AuthService.fetchMe()` 调用。
- `ApiClient` 会对 JSON 请求注入 Bearer token。
- `401` 时自动 `POST /auth/refresh`；refresh 失败会清理 token 并回到 `LoginPage`。
- `logout` 调用 `/auth/logout` 后清理 token 并回登录页。

## 7. Workbench 集成情况

- 已保留 F 的主工作台布局：顶部搜索栏、左侧订单资料调用、今日/本周订单、订单卡片、右侧 6 类资料卡片。
- 点击订单会刷新当前产品资料。
- 点击资料卡片上传按钮打开 G 的 `UploadDocumentDialog`。
- 上传成功后通过 `WorkbenchRefreshBus` 和本页刷新逻辑更新对应产品资料。
- 点击预览按钮打开 `DocumentPreviewPage`。
- 已接入 H 的四个入口：订单总览、客户与产品、连接器参数库、回收站。
- 保留登录态展示和退出登录。

## 8. PDF preview accessToken query 方案

- `DocumentPreviewService` 调用 `GET /documents/:id/preview` 获取 JSON。
- `previewStatus=ready` 时，`DocumentPreviewPage` 使用 `pages[].imageUrl` 渲染滚动图片列表。
- `previewStatus=pending` 时显示转换中并支持刷新。
- `previewStatus=failed` 时显示失败原因并支持刷新。
- `pages[].imageUrl` 为相对路径时通过 `ApiClient.resolveAssetUrl()` 自动拼接 `API_BASE_URL`。
- 图片 URL 不强行设置 Bearer header，统一通过 `ApiClient.withAccessToken()` 追加 `?accessToken=<accessToken>`。
- 未使用 WebView PDF，也不依赖系统 PDF 插件。

## 9. ArkTS 编译结果

- 本机未完成 ArkTS 编译。
- 原因：当前 Codex 环境中未发现 `hvigor`、`hvigorw` 或 `harmony-pad/hvigorw(.bat)` 可执行入口。
- 已完成的静态检查：
  - 相对 import 路径全部可解析。
  - 不存在两个 `ApiClient`。
  - 不存在两个 `TokenStorageService`。
  - 不存在两个 `UploadDocumentDialog`。
  - 不存在 `AuthTokenStore` 残留引用。
  - 不存在 `config/ApiConfig.ets` 残留引用。
  - 重复 type/class/interface/struct 名称检查通过。
  - `git diff --check` 无实际空白错误，仅 Windows CRLF 提示。

## 10. DevEco Studio 编译步骤

1. 用 DevEco Studio 打开 `C:\Users\31175\Desktop\hanglian-agent-i-arkts-integration\harmony-pad`。
2. 确认本机已安装 HarmonyOS API 12 SDK，并完成 Hvigor Sync。
3. 在 `entry/src/main/ets/services/AppConfig.ets` 中将 `API_BASE_URL` 替换为 Sealos HTTPS 后端地址，地址必须包含 `/api`。
4. 配置本机调试签名或使用 DevEco 自动生成调试签名。
5. 执行 `Build > Make Project` 或 `Build > Build Hap(s)/APP(s) > Build Hap(s)`。
6. 如有 ArkTS 类型错误，优先检查 `WorkbenchPage`、`WorkbenchApi`、`UploadService` 和系统 picker/request API 版本差异。
7. 连接 MatePad 真机，选择 `entry` 模块运行。

## 11. 真机测试清单

- 登录：用户名/密码登录成功，退出登录后回登录页。
- Token：JSON 请求带 Bearer，access token 过期后 refresh 成功继续请求，refresh 失败回登录页。
- 订单：今日订单、本周订单加载；点击订单后资料卡片刷新。
- 资料：6 类资料卡片显示真实 API 数据；接口失败时 mock fallback 不阻塞主流程。
- 上传：PDF/JPG/PNG/WEBP 均能选择或拍照上传，multipart 字段名为 `file`。
- 上传字段：确认提交 `productId`、可选 `planId`、`documentType`、`title`、`version`、`status`、`requiredForProcess`、可选 `keywords`。
- 上传成功：返回/解析 `documentId`，Workbench 对应产品资料刷新。
- 预览：PDF 和图片均通过 `/documents/:id/preview` 返回的图片页渲染。
- 预览状态：ready/pending/failed 三种状态均显示正确。
- 图片鉴权：所有 `pages[].imageUrl` 带 `accessToken` query。
- 下载：原 PDF/原文件下载入口可用。
- H 页面：订单总览、客户与产品、连接器参数库、回收站入口可打开；真实 API 优先，mock fallback 可用。
- 横屏：MatePad 横屏布局无关键按钮遮挡，顶部搜索栏和资料卡片可操作。
