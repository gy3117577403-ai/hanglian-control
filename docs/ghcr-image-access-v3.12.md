# GHCR Image Access V3.12

V3.12 publishes container images to GitHub Container Registry through a manual-or-branch-limited workflow.

## Images

- API: `ghcr.io/gy3117577403-ai/hanglian-control-api`
- Tablet: `ghcr.io/gy3117577403-ai/hanglian-control-tablet`

Safe tags:

- `v3.12-<short-sha>`
- `sha-<short-sha>`
- `v3.12-candidate`

The workflow must not publish `latest`, `production`, or `stable`.

## Access policy

- This stage does not change GHCR package visibility.
- This stage does not create a personal access token.
- This stage does not store registry credentials in the repository.
- If GHCR packages remain private, Sealos needs an image pull credential configured manually later.
- Do not place a GitHub token in normal environment variables or documentation.

## Safety boundaries

- No Sealos deployment is performed.
- No database connection is performed.
- No Prisma migration, db push, or seed is performed.
- No S3/Object Storage connection is performed.
- No GitHub package is deleted.

## Later deployment note

For V3.13 or later, configure Sealos image pull credentials only inside Sealos if the images are private. Do not paste registry tokens into chat or commit them into code.
