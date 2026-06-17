# Sealos Cloud deployment plan

This document is for the isolated Sealos test deployment of the wire harness control system.

## Safety rules

- Do not modify existing Sealos apps.
- Do not modify existing databases.
- Do not commit `DATABASE_URL`.
- Do not paste database credentials into chat.
- Use a new isolated PostgreSQL database for this system.
- Do not run seed or cleanup scripts in the cloud unless explicitly approved.
- Destructive database actions stay disabled.

## GitHub branch

Deploy from:

`feature/v3-6-sealos-cloud-deploy-prep`

## Sealos resources to create

Create these new resources only:

- PostgreSQL database: `hanglian-control-test-pg`
- API app: `hanglian-control-api`
- Tablet PWA app: `hanglian-control-tablet`

## API app

Use image:

`ghcr.io/gy3117577403-ai/hanglian-control-api:sealos-test`

Do not use the default `nginx` image.

Expose port:

`3000`

Environment variables:

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
API_PREFIX=api

DATA_SOURCE=prisma
DEMO_DATA_MODE=empty
DEPLOYMENT_STAGE=sealos-test
DB_TARGET=test
DATABASE_URL=<fill in Sealos PostgreSQL connection string in Sealos UI only, prefer schema=hanglian_control>
DATABASE_SSL_MODE=require
DATABASE_CONNECT_TIMEOUT_SECONDS=10

ALLOW_TEST_DB_CONNECT=true
ALLOW_PRISMA_WRITE=<set true only for this isolated Sealos test app>
ALLOW_DESTRUCTIVE_DB_ACTIONS=false

RUN_PRISMA_MIGRATE_DEPLOY=true
SEED_MODE=dry-run
```

If the Sealos connection string points to the default database and schema:

```text
database: postgres
schema: public
```

change only the schema query parameter in Sealos, for example:

```text
?schema=hanglian_control
```

Do not paste the full connection string into chat. Do not migrate into `postgres/public`.

Health check:

`/api/health`

Swagger:

`/api/docs`

## Tablet PWA app

Use image:

`ghcr.io/gy3117577403-ai/hanglian-control-tablet:sealos-test`

Do not use the default `nginx` image.

Expose port:

`80`

Environment variables:

```env
API_BASE_URL=https://<api-app-domain>/api
```

After deployment, open:

`https://<tablet-app-domain>/tablet`

## Migration behavior

The API app startup script runs:

```bash
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

only when:

- `RUN_PRISMA_MIGRATE_DEPLOY=true`
- `DATA_SOURCE=prisma`
- `DEPLOYMENT_STAGE=sealos-test`
- `DB_TARGET=test`
- `ALLOW_TEST_DB_CONNECT=true`
- `ALLOW_PRISMA_WRITE` is enabled only for the isolated Sealos test app
- `ALLOW_DESTRUCTIVE_DB_ACTIONS=false`
- `DATABASE_URL` is not the example value

No seed script runs automatically.

## GitHub image build

The workflow `.github/workflows/build-images.yml` builds and pushes two images to GitHub Container Registry:

- `ghcr.io/gy3117577403-ai/hanglian-control-api:sealos-test`
- `ghcr.io/gy3117577403-ai/hanglian-control-tablet:sealos-test`

It runs automatically when `feature/v3-6-sealos-cloud-deploy-prep` or `main` is pushed, and it can also be started manually from GitHub Actions.

If Sealos reports that it cannot pull an image, make the GHCR package visible to Sealos or configure Sealos with an image pull credential. Do not paste package tokens into chat.

## Verification

Local checks before pushing:

```bash
npm run sealos:cloud-deploy-check
npm run security:check
npm run build
npm run check
```

Cloud checks after deployment:

- API `/api/health` returns success.
- API `/api/system/database-safety` reports `stage=V3.6_SEALOS_CLOUD_TEST`.
- Tablet `/tablet` loads without mixed-content API errors.
- No existing Sealos app or database was changed.
