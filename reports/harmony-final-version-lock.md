# Harmony Final Version Lock

- 状态：通过
- 分支：release-harmony-mvp-day1
- 验证时 HEAD：4b1854b
- HAP BUILD_INFO commit：39db5d2
- HEAD 与 BUILD_INFO 是否一致：否
- 不一致原因：39db5d2 是最后一次进入 HAP 并完成真机验证的 harmony-pad 功能修复版本；4b1854b 只刷新了 BuildInfo 元数据和 QA 证据报告，不包含 harmony-pad 业务逻辑改动。本锁版报告提交也只记录证据，不改变 HAP 业务版本。
- 39db5d2..4b1854b 是否包含 harmony-pad 业务代码改动：否，仅 `BuildInfo.ets` 版本戳与 `reports/` 证据变化。
- 是否重新构建 HAP 以对齐 HEAD：否，按 evidence-only 差异判断不需要更新 BUILD_INFO；已重新执行 assembleHap 作为最终构建复核。
- AppConfig API_BASE_URL：`https://fyeboolnlvqv.sealoshzh.site/api`
- AppConfig API_PREFIX：空字符串

## QA 结果

- assembleHap：通过，BUILD SUCCESSFUL
- qa:harmony-api-e2e：通过，22 total / 0 failed
- qa:harmony-console:e2e：通过
- test:harmony-field：通过，8 total / 0 failed
- qa:harmony-device：通过
- FIELD_QA_RESULT：captured，success=true
- FIELD_UPLOAD_QA_RESULT：captured，success=true，png/pdf upload+preview 均通过，uploadUriScheme=internal
- RuntimeError/JS_ERROR：未观察到
- undefined is not callable：未观察到
- 17 Http protocol error：未观察到

## 证据文件

- `reports/harmony-api-e2e.json`
- `reports/harmony-qa-console-result.json`
- `reports/harmony-field-regression.json`
- `reports/harmony-device-qa.md`
- `reports/harmony-device-qa.log`
- `reports/harmony-final-version-lock.json`

## 未提交文件

- `harmony-pad/build-profile.json5`：本机签名配置，包含本机签名材料路径和密码字段，按要求不提交。
- `harmony-pad/local.properties`：本机配置，按要求不提交。

## 结论

最终锁版确认通过。当前可发布判断应以 HAP BUILD_INFO `39db5d2` 作为真机包业务版本；`4b1854b` 及后续锁版提交作为 QA 证据提交。
