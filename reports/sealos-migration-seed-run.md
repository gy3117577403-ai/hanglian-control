# Sealos Migration And Seed Run

- Date: 2026-06-29 Asia/Shanghai
- Project: hanglian
- Branch: release-harmony-mvp-day1
- Namespace: ns-jhdb1ue7
- Main API app: hanglian-control-api
- Public API: https://fyeboolnlvqv.sealoshzh.site/api

## Summary

- Status: success
- Main API image before: ghcr.io/gy3117577403-ai/hanglian-control-api@sha256:d421e4e749b59df8b5781e5be3d1fc7a848939fce0312240e8f493439be7a64e
- Main API image after: crpi-2acb2dabuutklbx4.cn-hangzhou.personal.cr.aliyuncs.com/zhiju-b/uss-app:hanglian-control-api-release-harmony-mvp-day1-1cbdbf50f9f4
- Release image digest: sha256:87f4fb71539fd966b0b83dd7f364cb1cffcce1bd8c5a413ef20d0636866cdeee
- Main API command: image default CMD, node apps/api/scripts/start-cloud.mjs
- Main API storage: /data/hanglian PVC mount retained
- Main API rollout: complete, 1/1 Ready, 0 restarts after rollout

## Image Correction

The original Sealos API image did not match the release branch contents. It only contained the first two Prisma migrations and did not contain apps/api/dist/src/auth/scripts/seed-admin.js. Because the current image was not release-compatible, a release image was built from git archive HEAD for commit 1cbdbf50f9f4 and pushed to the existing Aliyun registry repository under a dedicated tag.

No source files, Harmony AppConfig, HAP artifacts, or main/master branches were modified.

## Migration Runner

- Temporary app/resource: hanglian-migrate-runner
- Kind: Kubernetes Pod retained for audit logs
- Public access: none
- Image: crpi-2acb2dabuutklbx4.cn-hangzhou.personal.cr.aliyuncs.com/zhiju-b/uss-app:hanglian-control-api-release-harmony-mvp-day1-1cbdbf50f9f4
- Command: node scripts/run-prisma-migrate-deploy.mjs
- Wrapper delivery: ConfigMap hanglian-migrate-runner-script mounted at /app/scripts because Dockerfile.api does not copy root scripts into the final image
- Result: success, __MIGRATION_EXIT_CODE=0

Key log lines:

```text
migrationCount: 4
command: prisma migrate deploy --config=/app/apps/api/prisma.config.ts
Applying migration `20260617000100_initial_schema`
Applying migration `20260623010000_v318_persistence_upgrade`
Applying migration `20260628031500_add_auth_fields_to_users`
Applying migration `20260628080000_add_connector_process_parameters`
All migrations have been successfully applied.
__MIGRATION_EXIT_CODE=0
```

Prisma history verification:

```text
20260617000100_initial_schema: finished
20260623010000_v318_persistence_upgrade: finished
20260628031500_add_auth_fields_to_users: finished
20260628080000_add_connector_process_parameters: finished
```

Note: the first migrate attempt returned P3005 because public schema was non-empty due to PostgreSQL extension/audit objects, while no Prisma business tables or _prisma_migrations table existed. An empty _prisma_migrations table was created without marking any migration as applied; migrate deploy then applied all four migrations normally.

## Seed Runner

- Temporary app/resource: hanglian-seed-admin
- Kind: Kubernetes Pod retained for audit logs
- Public access: none
- Image: crpi-2acb2dabuutklbx4.cn-hangzhou.personal.cr.aliyuncs.com/zhiju-b/uss-app:hanglian-control-api-release-harmony-mvp-day1-1cbdbf50f9f4
- Command: node apps/api/dist/src/auth/scripts/seed-admin.js
- Result: success, __SEED_EXIT_CODE=0

Key log lines:

```text
success: true
message: Admin user is ready.
username: admin
role: ADMIN
isActive: true
__SEED_EXIT_CODE=0
```

## Verification

- Main API restart: completed via StatefulSet image update and rollout
- /api/health: HTTP 200 OK
- Health body: status ok, dataSource postgres, storageProvider local, databaseConnected true, databaseTarget staging, prismaWriteEnabled true
- Admin login: HTTP 201 Created
- Admin login response: access token present, refresh token present, user admin present, role ADMIN, isActive true

## Temporary Resources

- hanglian-migrate-runner retained for audit logs; it was left without public Service or Ingress.
- hanglian-seed-admin retained for audit logs; it was left without public Service or Ingress.
- hanglian-migrate-runner-script ConfigMap retained because the migration runner uses it to provide the root wrapper script.

## Follow-Up

- Optional cleanup after audit: delete hanglian-migrate-runner, hanglian-seed-admin, and hanglian-migrate-runner-script.
- Keep the main API on the release image tag above unless a future release image is published to the canonical GHCR repository.
