import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const root = process.cwd()
const failures = []
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

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

function parseEnv(content) {
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=')
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()]
      }),
  )
}

function request(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(options.timeoutMs ?? 5000) })
}

async function waitForHealth(baseUrl, child, logs) {
  const deadline = Date.now() + 70000
  let lastError = ''
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`API process exited early with code ${child.exitCode}. ${logs.join('\n').slice(-4000)}`)
    }
    try {
      const response = await request(`${baseUrl}/health`, { timeoutMs: 2500 })
      if (response.ok) return response
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error.message
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error(`Timed out waiting for API health: ${lastError}\n${logs.join('\n').slice(-4000)}`)
}

function waitForProcessExit(child, timeoutMs = 5000) {
  if (!child || child.exitCode !== null) return Promise.resolve()
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs)
    child.once('exit', () => {
      clearTimeout(timer)
      resolve()
    })
  })
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return
  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM')
    } catch {
      child.kill('SIGTERM')
    }
  }
  await waitForProcessExit(child)
  if (child.exitCode === null && process.platform !== 'win32') {
    try {
      process.kill(-child.pid, 'SIGKILL')
    } catch {
      child.kill('SIGKILL')
    }
    await waitForProcessExit(child, 2000)
  }
}

async function startApi(tempRoot, port) {
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    HOST: '127.0.0.1',
    PORT: String(port),
    API_PREFIX: 'api',
    DATA_SOURCE: 'mock',
    DEMO_DATA_MODE: 'demo',
    DEPLOYMENT_STAGE: 'v3.17-cloud-staging-check',
    DB_TARGET: 'local',
    FILE_STORAGE_PROVIDER: 'local',
    STORAGE_ROOT: path.join(tempRoot, 'storage'),
    METADATA_ROOT: path.join(tempRoot, 'metadata'),
    STORAGE_TEMP_ROOT: path.join(tempRoot, 'tmp'),
    STORAGE_MAX_FILE_SIZE_MB: '30',
    STORAGE_URL_MODE: 'proxy',
    CORS_ORIGINS: 'https://localhost,https://fqbkxzzolqqq.sealoshzh.site',
    CORS_ALLOW_CREDENTIALS: 'false',
    RUN_PRISMA_MIGRATE_DEPLOY: 'false',
    ALLOW_TEST_DB_CONNECT: 'false',
    ALLOW_PRISMA_WRITE: 'false',
    ALLOW_DESTRUCTIVE_DB_ACTIONS: 'false',
    SEED_MODE: 'dry-run',
    DATABASE_URL: '',
    DIRECT_URL: '',
    S3_ENDPOINT: '',
    S3_ACCESS_KEY_ID: '',
    S3_SECRET_ACCESS_KEY: '',
  }

  mkdirSync(env.STORAGE_ROOT, { recursive: true })
  mkdirSync(env.METADATA_ROOT, { recursive: true })
  mkdirSync(env.STORAGE_TEMP_ROOT, { recursive: true })

  const logs = []
  const command = process.platform === 'win32' ? 'cmd.exe' : npmCommand
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm run start -w api'] : ['run', 'start', '-w', 'api']
  const child = spawn(command, args, {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    detached: process.platform !== 'win32',
  })
  child.stdout.on('data', (chunk) => logs.push(String(chunk)))
  child.stderr.on('data', (chunk) => logs.push(String(chunk)))

  const baseUrl = `http://127.0.0.1:${port}/api`
  await waitForHealth(baseUrl, child, logs)
  return { child, baseUrl, env, logs }
}

async function run() {
  console.log('V3.17 cloud staging API check')
  console.log('This check uses a system temporary directory and does not connect to PostgreSQL, Sealos, or S3.')

  const envExample = read('apps/api/.env.cloud-staging.example')
  const startCloud = read('apps/api/scripts/start-cloud.mjs')
  const corsConfig = read('apps/api/src/config/cors.config.ts')
  const runtimeController = read('apps/api/src/runtime/runtime.controller.ts')
  const storageController = read('apps/api/src/storage/controllers/storage-status.controller.ts')
  const env = parseEnv(envExample)

  assert(env.DATA_SOURCE === 'mock', 'DATA_SOURCE must be mock.')
  assert(env.DEMO_DATA_MODE === 'demo', 'DEMO_DATA_MODE must be demo.')
  assert(env.FILE_STORAGE_PROVIDER === 'local', 'FILE_STORAGE_PROVIDER must be local.')
  assert(env.STORAGE_ROOT === '/data/hanglian', 'STORAGE_ROOT must be /data/hanglian.')
  assert(env.METADATA_ROOT === '/data/hanglian/metadata', 'METADATA_ROOT must be /data/hanglian/metadata.')
  assert(env.STORAGE_TEMP_ROOT === '/data/hanglian/tmp', 'STORAGE_TEMP_ROOT must be /data/hanglian/tmp.')
  assert(env.CORS_ORIGINS === 'https://localhost,https://fqbkxzzolqqq.sealoshzh.site', 'CORS_ORIGINS must use the comma-separated allowlist.')
  assert(env.CORS_ALLOW_CREDENTIALS === 'false', 'CORS credentials must be false.')
  assert(!('DATABASE_URL' in env), 'Cloud staging example must not define DATABASE_URL.')
  assert(!('DIRECT_URL' in env), 'Cloud staging example must not define DIRECT_URL.')
  assert(!Object.keys(env).some((key) => key.startsWith('S3_')), 'Cloud staging example must not define S3 variables.')
  assert(corsConfig.includes('.split(\',\')'), 'CORS parser must remain comma-separated.')
  assert(runtimeController.includes('databaseConnected: false'), 'runtime/info must not claim database connectivity.')
  assert(storageController.includes("Get('status')"), 'storage/status endpoint must exist.')
  assert(startCloud.includes("process.env.RUN_PRISMA_MIGRATE_DEPLOY ??= 'false'"), 'Cloud startup must default migration deploy to false.')
  assert(startCloud.includes('if (isTrue(process.env.RUN_PRISMA_MIGRATE_DEPLOY))'), 'Cloud startup must gate migration deploy behind an explicit flag.')

  const tempRoot = mkdtempSync(path.join(tmpdir(), 'hanglian-cloud-staging-'))
  const port = 38000 + Math.floor(Math.random() * 2000)
  let api
  try {
    api = await startApi(tempRoot, port + 1)
    const health = await (await request(`${api.baseUrl}/health`)).json()
    assert(health.status === 'ok', 'GET /api/health must return ok.')
    assert(health.dataSource === 'mock', 'GET /api/health must report dataSource=mock.')
    assert(health.databaseConnected === false, 'GET /api/health must report databaseConnected=false.')

    const storage = await (await request(`${api.baseUrl}/storage/status`)).json()
    assert(storage.provider === 'local', 'GET /api/storage/status must report local provider.')
    assert(storage.databaseConnected === false, 'GET /api/storage/status must report databaseConnected=false.')

    const runtime = await (await request(`${api.baseUrl}/runtime/info`)).json()
    assert(runtime.dataSource === 'mock', 'GET /api/runtime/info must report mock data source.')
    assert(runtime.databaseConnected === false, 'GET /api/runtime/info must report databaseConnected=false.')
    const runtimeText = JSON.stringify(runtime)
    assert(!/DATABASE_URL|S3_SECRET|ACCESS_KEY|TOKEN|SECRET|postgres:\/\//i.test(runtimeText), 'runtime/info must not leak sensitive environment values.')

    for (const origin of ['https://localhost', 'https://fqbkxzzolqqq.sealoshzh.site']) {
      const response = await request(`${api.baseUrl}/health`, {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'GET',
        },
      })
      assert(response.status === 204, `CORS preflight must return 204 for ${origin}.`)
      assert(response.headers.get('access-control-allow-origin') === origin, `CORS must allow ${origin}.`)
      assert(response.headers.get('access-control-allow-credentials') !== 'true', `CORS credentials must remain false for ${origin}.`)
    }

    const rejected = await request(`${api.baseUrl}/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://evil.example',
        'Access-Control-Request-Method': 'GET',
      },
    })
    assert(!rejected.headers.get('access-control-allow-origin'), 'Unauthorized Origin must not receive access-control-allow-origin.')

    const probeFile = path.join(api.env.STORAGE_ROOT, 'uploads', 'cloud-staging-probe.txt')
    mkdirSync(path.dirname(probeFile), { recursive: true })
    writeFileSync(probeFile, 'persistent probe', 'utf8')
    await stopProcess(api.child)
    api = await startApi(tempRoot, port)
    assert(existsSync(probeFile), 'Temporary storage file must still exist after API restart.')
    for (const metadataName of ['drawing-customers.json', 'production-orders.json']) {
      const file = path.join(api.env.METADATA_ROOT, metadataName)
      writeFileSync(file, '[]\n', 'utf8')
      assert(existsSync(file), `${metadataName} must be safely initializable in temp metadata root.`)
    }
  } finally {
    await stopProcess(api?.child)
    rmSync(tempRoot, { recursive: true, force: true })
  }

  if (failures.length) {
    console.error('Cloud staging API check failed:')
    for (const message of failures) console.error(`- ${message}`)
    process.exit(1)
  }

  console.log('Cloud staging API check passed.')
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
