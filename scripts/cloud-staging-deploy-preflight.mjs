import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []

function fail(message) {
  failures.push(message)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function read(relativePath) {
  const fullPath = path.join(root, relativePath)
  if (!existsSync(fullPath)) {
    fail(`Missing file: ${relativePath}`)
    return ''
  }
  return readFileSync(fullPath, 'utf8')
}

function gitShortSha() {
  try {
    return execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

console.log('V3.17 cloud staging deploy preflight')
console.log('This check is static and does not connect to Sealos, PostgreSQL, or S3.')

const shortSha = gitShortSha()
const envExample = read('apps/api/.env.cloud-staging.example')
const deploy = read('deploy/sealos/api-v3.17-cloud-staging.yaml')
const guide = read('docs/sealos-v3.17-cloud-staging-update-guide.md')
const workflow = read('.github/workflows/build-images-manual.yml')
const tabletStagingExample = read('apps/tablet/.env.android.staging.example')
const tabletStagingLocalPath = path.join(root, 'apps/tablet/.env.android.staging.local')
const tabletStagingLocal = existsSync(tabletStagingLocalPath) ? readFileSync(tabletStagingLocalPath, 'utf8') : ''
const gitignore = read('.gitignore')

assert(workflow.includes('feature/v3-17-cloud-staging-prep'), 'Image workflow must support the cloud staging prep branch.')
assert(workflow.includes('v3.17-cloud-${short_sha}') || workflow.includes('v3.17-cloud-'), 'Image workflow must generate v3.17-cloud short SHA tags.')
assert(workflow.includes('sha-${short_sha}') || workflow.includes('sha-'), 'Image workflow must generate sha short SHA tags.')
assert(workflow.includes('v3.17-cloud-candidate'), 'Image workflow must generate the candidate tag.')
assert(!/:\s*latest\b|latest\s*$/.test(workflow.replace(/Unsafe image tag is not allowed: latest/g, '')), 'Image workflow must not publish latest.')
assert(workflow.includes('metadata-action') || workflow.includes('digest'), 'Image workflow must output image digest.')
assert(workflow.includes('/api/health') && workflow.includes('/api/storage/status') && workflow.includes('/api/runtime/info'), 'Image workflow must smoke test API health, storage, and runtime endpoints.')
assert(!/DATABASE_URL\s*:|DATABASE_URL=postgres|postgres:\/\/|prisma migrate|db push|db seed/i.test(workflow), 'Image workflow must not configure database or run migrations.')

assert(envExample.includes('DATA_SOURCE=mock'), 'Cloud env must use DATA_SOURCE=mock.')
assert(envExample.includes('DEMO_DATA_MODE=demo'), 'Cloud env must use DEMO_DATA_MODE=demo.')
assert(envExample.includes('FILE_STORAGE_PROVIDER=local'), 'Cloud env must use local storage.')
assert(envExample.includes('STORAGE_ROOT=/data/hanglian'), 'Cloud env must mount /data/hanglian.')
assert(envExample.includes('CORS_ORIGINS=https://localhost,https://fqbkxzzolqqq.sealoshzh.site'), 'Cloud env must allow Capacitor and Tablet origins.')
assert(envExample.includes('RUN_PRISMA_MIGRATE_DEPLOY=false'), 'Migration deploy must be disabled.')
assert(envExample.includes('ALLOW_PRISMA_WRITE=false'), 'Prisma writes must be disabled.')
assert(envExample.includes('ALLOW_DESTRUCTIVE_DB_ACTIONS=false'), 'Destructive DB actions must be disabled.')
assert(!envExample.includes('DATABASE_URL'), 'Cloud env must not include DATABASE_URL.')
assert(!/S3_|SECRET|TOKEN/i.test(envExample), 'Cloud env must not include S3, Secret, or Token values.')
assert(!envExample.includes('*'), 'Cloud CORS must not use wildcard.')

assert(deploy.includes('mountPath: /data/hanglian'), 'Deployment template must mount /data/hanglian.')
assert(deploy.includes('fsGroup: 1000'), 'Deployment template must include fsGroup=1000.')
assert(deploy.includes('fsGroupChangePolicy: OnRootMismatch'), 'Deployment template must include fsGroupChangePolicy.')
assert(deploy.includes('runAsNonRoot: true'), 'Deployment template must recommend runAsNonRoot.')
assert(deploy.includes('allowPrivilegeEscalation: false'), 'Deployment template must disable privilege escalation.')
assert(deploy.includes('drop:') && deploy.includes('- ALL'), 'Deployment template must drop all capabilities.')
assert(deploy.includes('RuntimeDefault'), 'Deployment template must use RuntimeDefault seccomp.')
assert(deploy.includes('EXISTING_1GIB_PVC_NAME'), 'Deployment template must reference an existing PVC placeholder.')
assert(!/namespace:\s*(default|sealos|hanglian)/i.test(deploy), 'Deployment template must not hard-code a real namespace.')
assert(!/DATABASE_URL|S3_ACCESS_KEY|S3_SECRET|SECRET|TOKEN/i.test(deploy), 'Deployment template must not contain secrets or database settings.')

assert(guide.includes('回滚') && guide.includes('不删除卷'), 'Guide must include rollback steps that preserve the volume.')
assert(guide.includes('hanglian-control-api'), 'Guide must name the existing API application.')
assert(guide.includes('ghcr.io/gy3117577403-ai/hanglian-control-api'), 'Guide must include the API image repository.')
assert(guide.includes('/api/health') && guide.includes('/api/storage/status') && guide.includes('/api/runtime/info'), 'Guide must include validation endpoints.')
assert(guide.includes('fsGroup=1000') || guide.includes('fsGroup: 1000'), 'Guide must require fsGroup recheck.')
assert(!/DATABASE_URL\s*=|postgres:\/\/|S3_SECRET_ACCESS_KEY\s*=|TOKEN\s*=|SECRET\s*=/i.test(guide), 'Guide must not include database, S3, or token secret values.')

assert(tabletStagingExample.includes('https://YOUR_SEALOS_API_DOMAIN/api'), 'Android staging example must use HTTPS placeholder.')
if (tabletStagingLocal) {
  assert(tabletStagingLocal.includes('https://fyeboolnlvqv.sealoshzh.site/api'), 'Local Android staging env must point to the Sealos HTTPS API.')
  assert(!/http:\/\/|192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.|localhost:3000|DATABASE_URL/i.test(tabletStagingLocal), 'Local Android staging env must not use LAN, localhost, or database settings.')
}
assert(gitignore.includes('apps/tablet/.env.android.staging.local'), 'Local Android staging env must be ignored.')
assert(!shortSha || workflow.includes('v3.17-cloud-${short_sha}') || workflow.includes(shortSha) || workflow.includes('v3.17-cloud-'), 'Workflow must be SHA-tag based.')

if (failures.length) {
  console.error('Cloud staging deploy preflight failed:')
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Cloud staging deploy preflight passed.')
