# V3.10 Storage Architecture

## Scope

V3.10 adds a storage adapter layer for uploaded production documents. The default provider remains local file storage. S3/Object Storage is prepared as a disabled future option.

No Sealos database connection, Prisma migration, db push, seed, S3 bucket creation, or remote upload is performed in this stage.

## Providers

| Provider | Status | Purpose | Notes |
| --- | --- | --- | --- |
| local | Active default | Store uploaded files under `STORAGE_ROOT/uploads` | Designed for a future Sealos persistent volume. |
| s3 | Prepared only | Future object storage adapter | Requires explicit S3 env variables and `FILE_STORAGE_PROVIDER=s3`. |

## Runtime Paths

Local development defaults:

```env
FILE_STORAGE_PROVIDER=local
STORAGE_ROOT=./storage
METADATA_ROOT=./storage/metadata
STORAGE_TEMP_ROOT=./storage/tmp
STORAGE_URL_MODE=proxy
```

Sealos app alignment target:

```env
FILE_STORAGE_PROVIDER=local
STORAGE_ROOT=/data/hanglian
METADATA_ROOT=/data/hanglian/metadata
STORAGE_TEMP_ROOT=/data/hanglian/tmp
```

The future Sealos app should mount a persistent volume at `/data/hanglian`.

## Document Metadata

New uploads record:

- `storageProvider`
- `storageKey`
- `checksumSha256`
- `previewMode`
- `previewUrl`
- `downloadUrl`

Legacy records with only `storedFileName` remain readable through the compatibility path.

## API Endpoints

```text
GET /api/storage/status
GET /api/files/documents/:documentId/preview
GET /api/files/documents/:documentId/download
GET /api/files/:storedFileName
```

The old `GET /api/files/:storedFileName` route remains for legacy local records.

## Safety

- Storage status never prints secrets.
- S3 provider fails closed when configuration is incomplete.
- Metadata writes use temp files and atomic rename.
- Runtime uploads, metadata JSON, and temp files remain ignored by Git.
- Database flags remain disabled by default.

## Local Checks

```bash
npm run storage-flow:check
npm run cloud-alignment:check
npm run storage:legacy-scan
```
