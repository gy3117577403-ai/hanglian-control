# Harmony QA Console

电脑端浏览器 QA 页面，用于验证 Sealos API 链路，不作为车间正式 UI。

启动：

```powershell
npm run qa:harmony-console
```

然后打开：

```text
http://127.0.0.1:4179
```

默认配置：

- API_BASE_URL: `https://fyeboolnlvqv.sealoshzh.site/api`
- 账号: `admin`
- 密码: `123`

页面会隐藏 token 明文。上传步骤可选择 PDF/JPG/PNG/WEBP 文件；没有选择文件时会生成一个最小 PDF 做 API 链路验证。
