# V3.18 PostgreSQL Cutover Runbook

## A. Create Isolated Staging PostgreSQL

Create a new staging database that is not production. Do not reuse real production data for first migration tests.

## B. Readonly Connectivity

Configure `DATABASE_URL` outside Git, set `DB_TARGET=staging`, `ALLOW_TEST_DB_CONNECT=true`, `ALLOW_PRISMA_WRITE=false`, and keep `RUN_PRISMA_MIGRATE_DEPLOY=false`.

## C. Create Migration

Generate migration changes in a create-only workflow. Do not run `migrate dev` against shared data.

## D. Deploy Migration

Run migration deploy only as a deliberate staging operation, not during API startup.

## E. JSON Dry Run

Run:

```bash
node scripts/json-migration-dry-run.mjs --metadata-root <metadata> --uploads-root <uploads> --output <snapshot>
```

Resolve blockers before importing.

## F. Import

Use the import executor in dry-run first. Execution requires the explicit confirmation word:

```bash
MIGRATION_CONFIRMATION=IMPORT_JSON_TO_STAGING_POSTGRES
```

## G. Parity

Run parity with `--database-url-env`, never with a plaintext URL. Compare counts, keys, relations, checksums, covers, order statuses, import statistics, audit counts, and delete lock state.

## H. Postgres Readonly API

Start a staging API with `DATA_SOURCE=postgres` and write gate closed. Validate readonly behavior first.

## I. Enable Write Gate

Only after staging acceptance, set `ALLOW_PRISMA_WRITE=true`. Destructive operations remain closed unless a separate approved run requires them.

## J. App Acceptance

Validate tablet and Android behavior against staging API. Do not cut over the existing cloud API directly.

## K. Rollback

Switch `DATA_SOURCE=mock` and keep JSON metadata untouched. JSON remains the rollback source and read-only backup until a later explicit cleanup phase.

This runbook does not delete JSON metadata, does not change Sealos persistent volumes, and does not store PDFs or images inside PostgreSQL.
