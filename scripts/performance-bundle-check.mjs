import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const distDir = join(root, 'apps/tablet/dist');
const assetsDir = join(distDir, 'assets');
const blockers = [];
const warnings = [];
const maxJsChunkBytes = 500 * 1024;

function assert(condition, message) {
  if (!condition) blockers.push(message);
}

function toPosix(value) {
  return value.split('\\').join('/');
}

function rel(value) {
  return toPosix(relative(root, value));
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(dir, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function totalSize(files) {
  return files.reduce((sum, file) => sum + statSync(file).size, 0);
}

function sizeKb(value) {
  return `${(value / 1024).toFixed(1)}KB`;
}

console.log('V3.15 performance bundle check');
console.log('This check is read-only. It does not connect to a database and does not write runtime data.');

assert(existsSync(distDir), 'apps/tablet/dist should exist. Run npm run build -w tablet before this check.');
assert(existsSync(assetsDir), 'apps/tablet/dist/assets should exist. Run npm run build -w tablet before this check.');

const files = walk(distDir);
const jsFiles = files.filter((file) => extname(file) === '.js');
const cssFiles = files.filter((file) => extname(file) === '.css');
const mapFiles = files.filter((file) => file.endsWith('.map'));
const assetNames = files.map((file) => rel(file));

for (const file of jsFiles) {
  const size = statSync(file).size;
  if (size > maxJsChunkBytes) blockers.push(`${rel(file)} is ${sizeKb(size)} and exceeds the 500KB JS chunk budget.`);
  else if (size > maxJsChunkBytes * 0.9) warnings.push(`${rel(file)} is ${sizeKb(size)} and is close to the 500KB JS chunk budget.`);
}

for (const sourceMap of mapFiles) {
  blockers.push(`${rel(sourceMap)} should not be included in the production tablet build.`);
}

const requiredLazyChunks = [
  'WarmPdfImportDialog',
  'WarmOrderImportDialog',
  'WarmDocumentViewer',
  'WarmCustomerProductMaintenanceDialog',
  'WarmConnectorParameterView',
  'WarmFixtureParameterView',
];
for (const chunkName of requiredLazyChunks) {
  assert(assetNames.some((name) => name.includes(chunkName) && name.endsWith('.js')), `${chunkName} should be emitted as a lazy JavaScript chunk.`);
}

assert(assetNames.some((name) => /pdf\.worker/i.test(name)), 'PDF.js worker should be emitted as a separate asset.');

const largest = [...files]
  .sort((a, b) => statSync(b).size - statSync(a).size)
  .slice(0, 15)
  .map((file) => {
    const size = statSync(file).size;
    const gzipSize = gzipSync(readFileSync(file)).length;
    return `${rel(file)} ${sizeKb(size)} gzip ${sizeKb(gzipSize)}`;
  });

console.log(`JavaScript total: ${sizeKb(totalSize(jsFiles))}`);
console.log(`CSS total: ${sizeKb(totalSize(cssFiles))}`);
console.log('Largest assets:');
for (const item of largest) console.log(`- ${item}`);

if (warnings.length) {
  console.log('\nWarnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (blockers.length) {
  console.error('\nV3.15 performance bundle check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('V3.15 performance bundle check passed.');
