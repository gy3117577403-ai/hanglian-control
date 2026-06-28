# Agent J Backend Extra API Report

## Scope

- Branch/worktree: `agent-j-backend-extra-api`
- Base branch: `backend-integration-mvp`
- Added guarded ArkTS API paths:
  - `GET /api/connector-params`
  - `POST /api/connector-params`
  - `PATCH /api/connector-params/:id`
  - `DELETE /api/connector-params/:id`
  - `POST /api/connector-params/import`
  - `GET /api/connector-params/export`
  - `POST /api/connector-params/import-one`
  - `GET /api/recycle-bin`
  - `PATCH /api/recycle-bin/:id/restore`
  - `DELETE /api/recycle-bin/:id`

## Implementation

- Added `ConnectorParamsModule` with `JwtAuthGuard` on the controller.
- Added `RecycleBinModule` with `JwtAuthGuard` on the controller.
- Connector parameters support keyword search over `connectorModel` and `remark`, `status` filtering, soft delete, single-model import/upsert, CSV export, and a safe bulk import placeholder that accepts files and returns parsed row count/TODO status.
- Recycle bin currently supports `documents` via `ProductDocument.deletedAt/deleted`, with filters for `customerId`, `productId`, `category`, and `keyword`.
- Mock mode stores connector params in local metadata and seeds from the existing document-hub connector parameter seed.
- Postgres mode uses the new `ConnectorProcessParameter` Prisma model and existing `ProductDocument` fields.
- `JwtAuthGuard` now accepts existing mock-login tokens only when `DATA_SOURCE=mock`, keeping PostgreSQL JWT behavior unchanged.

## Database

- Added non-destructive migration:
  - `apps/api/prisma/migrations/20260628080000_add_connector_process_parameters/migration.sql`
- Added Prisma model:
  - `ConnectorProcessParameter`
- Recycle bin reuses `ProductDocument.deletedAt` and `deleted`; no trash table was added.

## Verification

- `npm run prisma:validate`: passed
- `npm run prisma:generate`: passed
- `npm run build -w api`: passed
- Smoke test on local mock API `http://127.0.0.1:3107/api`: passed
  - mock login
  - create connector param
  - query connector params
  - patch connector param
  - soft delete connector param
  - import-one connector param
  - bulk import placeholder accepts CSV and returns parsed count
  - export connector params
  - query recycle bin
  - restore document
  - permanent delete document

## Notes

- `POST /api/connector-params/import` intentionally returns a clear TODO placeholder for full Excel apply while accepting file uploads and reporting parsed row count.
- Runtime metadata `apps/api/storage/metadata/connector-params.json` is ignored like the other local storage metadata files.
