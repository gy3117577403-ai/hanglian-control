# V3.18 PostgreSQL Migration Plan

## Current JSON Structure

The current default data source is `DATA_SOURCE=mock`. Business metadata stays in JSON files under the configured metadata root, while PDFs and images stay in the uploads root.

- `drawing-customers.json`: drawing customer records.
- `drawing-products.json`: drawing product records.
- `drawing-module-settings.json`: product module state, module items, trash index, and covers.
- `drawing-import-records.json`: PDF import preview/apply batches and items.
- `production-orders.json`: production order records.
- `order-import-records.json`: order import batches and items.
- `documents.json`: uploaded document metadata.
- `audit-logs.json`: audit events.
- `delete-lock-settings.json`: delete lock settings.

File bodies are not migrated into PostgreSQL. PostgreSQL stores metadata only; file bodies continue to live in the persistent volume uploads directory.

## Repository Structure

V3.18A adds a repository boundary:

- `DrawingRepository`
- `DocumentRepository`
- `OrderRepository`
- `AuditRepository`
- `DeleteLockRepository`
- `PersistenceUnitOfWork`

`DATA_SOURCE=mock` selects JSON adapters that wrap the current stores. `DATA_SOURCE=postgres` selects Prisma adapters and must pass the staging safety gates before a connection is created.

## Migration Order

1. Customers
2. Products
3. ProductModules
4. ProductDocuments
5. PdfImportBatches
6. PdfImportItems
7. ProductionOrders
8. AuditLogs
9. DeleteLockSetting

## Dry Run And Data Gates

Run `json-migration-plan.mjs` and `json-migration-dry-run.mjs` with explicit roots:

```bash
node scripts/json-migration-plan.mjs --metadata-root <metadata> --uploads-root <uploads>
node scripts/json-migration-dry-run.mjs --metadata-root <metadata> --uploads-root <uploads>
```

The tools refuse to default to `/data/hanglian`. They check duplicate keys, missing relations, missing files, checksum mismatches, invalid order states, audit leaks, and delete lock shape.

## Staging Only

PostgreSQL mode requires:

- `DATA_SOURCE=postgres`
- `DATABASE_URL` configured outside Git
- `DB_TARGET=staging`
- `ALLOW_TEST_DB_CONNECT=true`
- `RUN_PRISMA_MIGRATE_DEPLOY=false`

Writes additionally require `ALLOW_PRISMA_WRITE=true`. Destructive actions remain behind `ALLOW_DESTRUCTIVE_DB_ACTIONS=true` and are not called by the application code in this phase.

## Import And Parity

The import executor defaults to dry-run. Execution requires:

- `--execute`
- `DB_TARGET=staging`
- `ALLOW_TEST_DB_CONNECT=true`
- `ALLOW_PRISMA_WRITE=true`
- `MIGRATION_CONFIRMATION=IMPORT_JSON_TO_STAGING_POSTGRES`

After import, run the parity tool with `--database-url-env`, never a plain URL argument. Parity compares counts, key sets, customer-product relations, six-module completeness, checksums, effective versions, covers, order status, import statistics, audit counts, and delete lock status without printing hashes.

## Cutover And Rollback

Cutover is done by switching `DATA_SOURCE` after staging validation. JSON metadata is retained as a read-only backup. Rollback means switching back to `DATA_SOURCE=mock` and leaving JSON metadata untouched.

This V3.18A phase does not connect to PostgreSQL, does not execute migration, and does not modify Sealos.
