# V3.10 Sealos App Alignment

## Current Decision

The Sealos database line is paused. V3.10 only prepares the app and storage configuration so a future cloud deployment can persist uploaded files safely.

## Do Not Do In This Stage

- Do not run `db:readonly-check`.
- Do not run `prisma migrate`, `prisma db push`, or `prisma db seed`.
- Do not connect to Sealos PostgreSQL.
- Do not create or connect an object storage bucket.
- Do not change Sealos app environment variables from this code task.
- Do not upload real customer drawings.

## Target Sealos API App Settings

The API container should expose port `3000`.

The API app should mount persistent storage:

| Mount path | Purpose |
| --- | --- |
| `/data/hanglian/uploads` | Uploaded PDF/image files |
| `/data/hanglian/metadata` | Local metadata JSON while database is paused |
| `/data/hanglian/tmp` | Atomic write temp files |

Environment placeholders are documented in:

```text
deploy/sealos/api-storage-env.example
```

## Default Startup Behavior

`Dockerfile.api` and `apps/api/scripts/start-cloud.mjs` default to:

```env
RUN_PRISMA_MIGRATE_DEPLOY=false
ALLOW_PRISMA_WRITE=false
ALLOW_DESTRUCTIVE_DB_ACTIONS=false
FILE_STORAGE_PROVIDER=local
STORAGE_ROOT=/data/hanglian
```

So the app can start without applying database migrations.

## Future Database Cutover

Only after a deliberate database stage is resumed:

1. Prepare an empty or explicitly baselined PostgreSQL schema.
2. Configure `DATABASE_URL` only in Sealos environment variables.
3. Keep `ALLOW_DESTRUCTIVE_DB_ACTIONS=false`.
4. Run a separate reviewed migration plan.
5. Switch repository source from mock/local metadata to Prisma only after verification.

## Future Object Storage Cutover

Only after an object storage service is selected:

1. Create bucket outside this code task.
2. Configure S3 endpoint, bucket, access key, and secret in Sealos secret/env UI.
3. Set `FILE_STORAGE_PROVIDER=s3`.
4. Run a dedicated storage smoke test.
5. Decide whether previews use signed URLs or API proxy.
