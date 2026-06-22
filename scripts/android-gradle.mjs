import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const androidDirCandidates = [
  path.join(root, 'apps/tablet/android'),
  path.join(root, 'android'),
]
const androidDir = androidDirCandidates.find((candidate) => existsSync(candidate))
const isWindows = process.platform === 'win32'
const gradleFile = isWindows ? 'gradlew.bat' : 'gradlew'
const args = process.argv.slice(2)

if (!androidDir) {
  console.error('Android project not found. Expected apps/tablet/android or android.')
  process.exit(1)
}

const gradlePath = path.join(androidDir, gradleFile)

if (!existsSync(gradlePath)) {
  console.error(`Android Gradle wrapper not found: ${path.relative(root, gradlePath)}`)
  process.exit(1)
}

const result = spawnSync(gradlePath, args.length ? args : ['assembleDebug'], {
  cwd: androidDir,
  stdio: 'inherit',
  shell: isWindows,
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

process.exit(result.status ?? 1)
