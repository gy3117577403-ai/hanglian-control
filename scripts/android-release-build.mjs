#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import path from 'node:path'

const releaseWebUrl = process.env.CAPACITOR_REMOTE_WEB_URL?.trim() || 'https://fyeboolnlvqv.sealoshzh.site/tablet'
const env = {
  ...process.env,
  CAPACITOR_REMOTE_WEB_URL: releaseWebUrl,
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

rmSync(path.join(process.cwd(), 'apps/tablet/android/app/src/main/assets/public'), {
  force: true,
  recursive: true,
})

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
