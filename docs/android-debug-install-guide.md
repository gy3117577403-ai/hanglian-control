# Android Debug APK 手动安装指南

本指南用于 V3.16A Debug APK 内部测试。不要把 Debug APK 当作正式发布包，不要上传到公开渠道。

## APK 路径

构建成功后文件位于：

```text
apps/tablet/android/app/build/outputs/apk/debug/app-debug.apk
```

## 手动安装

1. 将 `app-debug.apk` 复制到安卓平板。
2. 在平板上打开文件。
3. 如系统提示“安装未知应用”，只为当前文件管理器或浏览器临时允许。
4. 安装后打开 `线束资料工作台`。
5. 确认电脑和平板在同一 Wi-Fi，且本机 API 可通过 `http://<电脑IPv4>:3000/api/health` 访问。

## USB ADB 安装（仅文档说明）

本阶段不会自动执行 `adb install`。如果后续需要手动安装，可在确认设备授权后运行：

```bash
adb devices
adb install -r apps/tablet/android/app/build/outputs/apk/debug/app-debug.apk
```

## LAN Debug 要求

- API 必须使用 `DATA_SOURCE=mock`。
- `/api/health` 应返回 `databaseConnected=false`。
- 本机忽略文件 `apps/tablet/.env.android.local` 可以配置：

```env
VITE_NATIVE_API_BASE_URL=http://<电脑IPv4>:3000/api
VITE_NATIVE_API_ENV=android-lan-debug
```

该文件禁止提交。

## Release 注意事项

- Release API 必须使用 HTTPS 域名。
- Release 不应允许 cleartext HTTP。
- 不要在 APK、源码或文档中写入 `DATABASE_URL`、S3 密钥、企业微信 Secret、Sealos Token 或正式签名密码。
- 正式签名前需要另开阶段处理 keystore、签名策略和发布流程。
