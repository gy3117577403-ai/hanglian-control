#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const releaseWebUrl = process.env.CAPACITOR_REMOTE_WEB_URL?.trim() || 'https://fyeboolnlvqv.sealoshzh.site/tablet'
const releaseApiBaseUrl = process.env.VITE_NATIVE_API_BASE_URL?.trim() || 'https://fyeboolnlvqv.sealoshzh.site/api'
const releaseApiEnv = process.env.VITE_NATIVE_API_ENV?.trim() || 'android-cloud-release'
const env = {
  ...process.env,
  CAPACITOR_REMOTE_WEB_URL: releaseWebUrl,
  VITE_NATIVE_API_BASE_URL: releaseApiBaseUrl,
  VITE_NATIVE_API_ENV: releaseApiEnv,
}

const commands = [
  ['npm', ['run', 'build:android:release', '-w', 'tablet']],
  ['npm', ['run', 'cap:sync:android:release', '-w', 'tablet']],
]

for (const [command, args] of commands) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

const publicDir = path.join(process.cwd(), 'apps/tablet/android/app/src/main/assets/public')
rmSync(publicDir, {
  force: true,
  recursive: true,
})
mkdirSync(publicDir, { recursive: true })
const offlineTemplate = readFileSync(path.join(process.cwd(), 'apps/tablet/android/offline/offline.html'), 'utf8')
writeFileSync(
  path.join(publicDir, 'offline.html'),
  offlineTemplate.replaceAll('__HANGLIAN_TABLET_URL__', releaseWebUrl),
)

for (const args of [
  ['run', 'android:assemble:production-release', '-w', 'tablet'],
  ['run', 'android:bundle:production-release', '-w', 'tablet'],
]) {
  const result = spawnSync('npm', args, {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
