# Harmony Field Final QA

- Generated at: 2026-06-29T06:46:12.775Z
- Branch: release-harmony-mvp-day1
- API E2E: PASS (22 steps, 0 failed)
- QA Console E2E: PASS (0 failed)
- QA Console screenshot: reports/screenshots/harmony-qa-console-result.png
- test:harmony-field: PASS (8 checks, 0 failed)
- assembleHap: PASS
- Device QA: PASS (FIELD_QA_RESULT=success=true)

## Evidence

- API report: reports/harmony-api-e2e.json
- QA Console report: reports/harmony-qa-console-result.json
- Field regression report: reports/harmony-field-regression.json
- Device QA report: reports/harmony-device-qa.md
- Device QA log: reports/harmony-device-qa.log
- Device QA layout: reports/harmony-device-layout.json

## Fixes

- Added and executed public API E2E for health/login/me, customer/product CRUD, connector CRUD/import/export, upload, preview, and document refresh.
- Added QA Console Playwright E2E evidence with a local proxy for browser CORS, JSON result, and screenshot.
- Expanded TestLabPage to run native ArkTS UploadService PNG/PDF uploads and emit FIELD_QA_RESULT.
- Changed the TestLab PDF fixture to a valid one-page PDF so device PDF preview passes.
- Added qa:harmony-device automation using hdc + uitest to install, launch, login, enter Workbench, open TestLabPage, and validate FIELD_QA_RESULT.
- Kept RecycleBinPage safety under test:harmony-field and verified device logs contain no undefined is not callable or RuntimeError.

## Not Fully Automated

- Standard /recycle-bin restore/permanent-delete was not fully automated because /documents/:id/archive does not create /recycle-bin entries; list/page stability is covered.
- Full visual order overview interaction still benefits from manual MatePad acceptance; /orders/today is covered by API and device QA.

## Manual MatePad Acceptance

- Install the latest HAP on MatePad, login with the agreed test admin account, and confirm Workbench opens.
- Open Customer/Product, Connector Params, Recycle Bin, and Order Overview from Workbench and confirm no white screen or crash.
- When a real recycle-bin item exists, manually validate restore and permanent delete.
- Open TestLabPage and run the one-click device QA; confirm all items pass.
