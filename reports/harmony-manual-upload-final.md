# Harmony Manual Upload Final Report

- status: passed
- branch: release-harmony-mvp-day1
- verified HEAD before final commit: 756e457
- BUILD_INFO: commit=756e457, buildTime=2026-06-29T08:47:34.624Z, appVersion=1.0.0
- API_BASE_URL: https://fyeboolnlvqv.sealoshzh.site/api

## Scope

This pass fixes the MatePad `DocumentUploadPage` manual upload path. Backend, Sealos, database migrations, production smoke script, and `AppConfig.ets` API address were not changed.

## Root Cause

The manual upload page could send a synthetic fallback `planId` shaped like `product-<id>` from the Workbench/catalog path. The backend rejected that upload request with a 500 response, while Harmony `request.uploadFile` surfaced the failure as code 17 / `Http protocol error`. TestLab uploads did not include that synthetic `planId`, which is why TestLab passed while the real upload page failed.

## Fix Summary

- Unified upload file objects across TestLab, file picker, and camera paths with `NormalizedUploadFile`.
- Ensured file picker and camera files are copied to cache and verified as non-empty before upload.
- Preserved upload MIME and extension mapping for PDF/JPG/JPEG/PNG/WEBP.
- Kept `request.uploadFile` request data limited to backend DTO fields.
- Omitted synthetic `planId` values while preserving the real `productId`.
- Added sanitized manual upload failure detail logging and copyable error summaries.
- Added a small-file manual multipart fallback for request.uploadFile code 17 / `Http protocol error`.
- Extended `qa:harmony-device` so it enters `DocumentUploadPage` and verifies file-picker PDF plus camera-source JPG upload and preview through hidden page QA controls.

## Verification

- `npm run qa:harmony-api-e2e`: passed, 22/22
- `npm run qa:harmony-console:e2e`: passed
- `npm run test:harmony-field`: passed, 8/8
- `assembleHap`: passed, BUILD SUCCESSFUL
- `npm run qa:harmony-device`: passed

## Device Evidence

- `FIELD_QA_RESULT`: success=true
- `FIELD_UPLOAD_QA_RESULT`: pngUpload=true, pngPreview=true, pdfUpload=true, pdfPreview=true, uploadUriScheme=internal
- `FIELD_MANUAL_UPLOAD_PAGE_RESULT`: filePickerPdfUpload=true, filePickerPdfPreview=true, cameraJpgUpload=true, cameraJpgPreview=true, uploadUriScheme=internal, requestUploadFile=true, multipartFallback=false
- RuntimeError / JS_ERROR / undefined is not callable: not observed
- 17 Http protocol error: not observed in the final device QA log
- RecycleBin crash: not observed
- Workbench Grid click issue: not observed by regression
- Normal UI debug fields: not exposed

## Remaining Manual Check

The automated device QA verifies the real `DocumentUploadPage` flow through hidden page controls, including a camera-source cached JPG path, but it does not open the system camera UI. A final human smoke check should still take one physical photo on the MatePad and upload it from `DocumentUploadPage`.
