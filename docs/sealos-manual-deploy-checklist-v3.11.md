# Sealos Manual Deploy Checklist V3.11

This checklist is for later manual deployment. It is not an instruction to deploy during V3.11 commit preparation.

## Safety

- Do not modify existing Sealos apps unless the user explicitly approves it.
- Do not modify existing Sealos databases.
- Do not paste `DATABASE_URL`, S3 keys, tokens, or passwords into chat.
- Do not run Prisma migration, db push, or seed commands unless a later task explicitly authorizes it.
- Do not connect real S3/Object Storage during this stage.

## API app

Create or update only after explicit user approval:

- App name: `hanglian-control-api`
- Image: `ghcr.io/gy3117577403-ai/hanglian-control-api:<approved-tag>`
- Container port: `3000`
- Public access: enabled only when a public API domain is needed.
- Replica count: `1` while metadata is file-backed.
- Persistent volume mount path: `/data/hanglian`

Required non-secret env:

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
API_PREFIX=api
DATA_SOURCE=mock
DEMO_DATA_MODE=empty
FILE_STORAGE_PROVIDER=local
STORAGE_ROOT=/data/hanglian
METADATA_ROOT=/data/hanglian/metadata
STORAGE_TEMP_ROOT=/data/hanglian/tmp
STORAGE_URL_MODE=proxy
CORS_ORIGINS=https://YOUR_TABLET_DOMAIN
CORS_ALLOW_CREDENTIALS=false
RUN_PRISMA_MIGRATE_DEPLOY=false
ALLOW_TEST_DB_CONNECT=false
ALLOW_PRISMA_WRITE=false
ALLOW_DESTRUCTIVE_DB_ACTIONS=false
```

Do not configure `DATABASE_URL` until the database line is resumed.

## Tablet app

Create or update only after explicit user approval:

- App name: `hanglian-control-tablet`
- Image: `ghcr.io/gy3117577403-ai/hanglian-control-tablet:<approved-tag>`
- Container port: `80`
- Public access: enabled for tablet access.
- Persistent volume: none.

Runtime env:

```env
RUNTIME_API_BASE_URL=https://YOUR_API_DOMAIN/api
RUNTIME_APP_ENV=sealos-demo
RUNTIME_STORAGE_MODE=persistent-volume
```

## Verification after manual deployment

- API `GET /api/health` returns status ok.
- API `GET /api/runtime/info` reports `dataSource=mock`.
- API `GET /api/storage/status` reports local or persistent-volume mode.
- API `GET /api/storage/mount-readiness` reports safe read-only readiness.
- Tablet opens `/tablet`.
- Tablet API base URL points to the API domain and ends with `/api`.
- Browser console has no CORS error.
- No database migration, seed, or S3 connection has occurred.

## Known limitations

- File metadata on a persistent volume is suitable for a single API replica only.
- Uploads are not shared across regions or apps unless the same volume is mounted to the same API app.
- Future PostgreSQL integration should move business metadata out of local JSON files.
- Future object storage integration should store file blobs outside the API container volume.
