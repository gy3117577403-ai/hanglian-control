# Sealos Persistent Volume Mount

This checklist is for manual Sealos configuration only. V3.11 does not deploy or modify Sealos automatically.

## API App

- Mount the persistent volume only on the API app.
- Mount path: `/data/hanglian`
- Suggested initial capacity: start small for demo data, then resize after real file volume is known.
- Expected subdirectories:
  - `/data/hanglian/uploads`
  - `/data/hanglian/metadata`
  - `/data/hanglian/tmp`
- Current recommended API replica count: `1`.
- Do not use multiple API replicas unless the Sealos volume supports safe shared writes or storage is moved to S3/object storage.

## Tablet App

- The Tablet app serves static PWA files through Nginx.
- The Tablet app does not need the `/data/hanglian` volume.
- Configure `RUNTIME_API_BASE_URL` to the API public domain plus `/api`.

## Current Stage

- Database remains disabled for runtime data.
- S3/object storage remains disabled.
- This file contains no secrets and no real domain names.
