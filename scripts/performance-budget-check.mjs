import { existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const assetsDir = join(root, 'apps/tablet/dist/assets');
const maxJsChunkBytes = 500 * 1024;
const failures = [];
const warnings = [];

function toPosix(value) {
  return value.split('\\').join('/');
}

function rel(value) {
  return toPosix(relative(root, value));
}

console.log('Tablet performance budget check');
console.log('This check is read-only. It does not connect to a database and does not write data.');

if (!existsSync(assetsDir)) {
  failures.push('apps/tablet/dist/assets does not exist. Run npm run build:tablet before this check.');
} else {
  const jsFiles = readdirSync(assetsDir)
    .filter((name) => extname(name) === '.js')
    .map((name) => join(assetsDir, name))
    .sort((a, b) => statSync(b).size - statSync(a).size);

  for (const file of jsFiles) {
    const size = statSync(file).size;
    if (size > maxJsChunkBytes) {
      failures.push(`${rel(file)} is ${(size / 1024).toFixed(1)}KB; must stay under 500KB for smoother Android tablet loading.`);
    } else if (size > maxJsChunkBytes * 0.9) {
      warnings.push(`${rel(file)} is ${(size / 1024).toFixed(1)}KB; close to the 500KB budget.`);
    }
  }

  const tabletEntry = jsFiles.find((file) => /TabletDashboard-/.test(file));
  if (tabletEntry) {
    const tabletSize = statSync(tabletEntry).size;
    if (tabletSize > 90 * 1024) {
      warnings.push(`${rel(tabletEntry)} is ${(tabletSize / 1024).toFixed(1)}KB; keep the first tablet screen lean.`);
    }
  } else {
    failures.push('Could not find TabletDashboard chunk after build.');
  }

  console.log(`Checked ${jsFiles.length} JavaScript chunks.`);
}

if (warnings.length) {
  console.log('\nWarnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (failures.length) {
  console.error('\nPerformance budget check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Tablet performance budget check passed.');
