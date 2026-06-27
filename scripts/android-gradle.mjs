import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const javaExecutable = isWindows => isWindows ? 'java.exe' : 'java'
const androidDirCandidates = [
  path.join(root, 'apps/tablet/android'),
  path.join(root, 'android'),
]
const androidDir = androidDirCandidates.find((candidate) => existsSync(candidate))
const isWindows = process.platform === 'win32'
const gradleFile = isWindows ? 'gradlew.bat' : 'gradlew'
const args = process.argv.slice(2)
const javaHomeCandidates = [
  process.env.JAVA_HOME,
  process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Android/AndroidStudio/android-studio/jbr') : '',
  isWindows ? 'C:/Program Files/Android/Android Studio/jbr' : '',
].filter(Boolean)

if (!androidDir) {
  console.error('Android project not found. Expected apps/tablet/android or android.')
  process.exit(1)
}

const gradlePath = path.join(androidDir, gradleFile)

if (!existsSync(gradlePath)) {
  console.error(`Android Gradle wrapper not found: ${path.relative(root, gradlePath)}`)
  process.exit(1)
}

const detectedJavaHome = javaHomeCandidates.find((candidate) => existsSync(path.join(candidate, 'bin', javaExecutable(isWindows))))
const env = { ...process.env }
if (!env.JAVA_HOME && detectedJavaHome) {
  env.JAVA_HOME = detectedJavaHome
  env.PATH = `${path.join(detectedJavaHome, 'bin')}${path.delimiter}${env.PATH ?? ''}`
}

const result = spawnSync(gradlePath, args.length ? args : ['assembleDebug'], {
  cwd: androidDir,
  env,
  stdio: 'inherit',
  shell: isWindows,
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

process.exit(result.status ?? 1)
