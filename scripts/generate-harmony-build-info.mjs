import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = join(repoRoot, 'harmony-pad', 'entry', 'src', 'main', 'ets', 'services', 'BuildInfo.ets');

function git(args) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim();
}

function safe(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const commit = git(['rev-parse', '--short', 'HEAD']);
const buildTime = new Date().toISOString();
const appVersion = '1.0.0';

const content = `import { AppConfig } from './AppConfig';

export interface BuildInfoSnapshot {
  commit: string;
  buildTime: string;
  appVersion: string;
  apiBaseUrl: string;
}

export class BuildInfo {
  static readonly COMMIT: string = '${safe(commit)}';
  static readonly BUILD_TIME: string = '${safe(buildTime)}';
  static readonly APP_VERSION: string = '${safe(appVersion)}';

  static snapshot(): BuildInfoSnapshot {
    return {
      commit: BuildInfo.COMMIT,
      buildTime: BuildInfo.BUILD_TIME,
      appVersion: BuildInfo.APP_VERSION,
      apiBaseUrl: AppConfig.API_BASE_URL
    };
  }

  static log(): void {
    console.info('[HanglianPad] BUILD_INFO ' + JSON.stringify(BuildInfo.snapshot()));
  }
}
`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, content, 'utf8');
console.log(`Generated ${outputPath}`);
console.log(`BUILD_INFO ${JSON.stringify({ commit, buildTime, appVersion })}`);
