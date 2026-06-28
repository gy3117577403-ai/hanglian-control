import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const blockers = [];

function assert(condition, message) {
  if (!condition) blockers.push(message);
}

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function walk(dir, result = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, result);
    } else if (entry.isFile() && entry.name.endsWith('.vue')) {
      result.push(full);
    }
  }
  return result;
}

const businessRoots = [
  'apps/tablet/src/components/hub',
  'apps/tablet/src/components/drawing',
  'apps/tablet/src/components/upload',
  'apps/tablet/src/components/warm',
  'apps/tablet/src/components/document',
];
const bannedPhrases = [
  'HL_REAL_DATA_TEST',
  '本地测试上传',
  '测试上传护栏',
  '测试完成后清理',
  'API 上传诊断',
  '本地沙盒',
];

for (const relativePath of businessRoots) {
  assert(existsSync(join(root, relativePath)), `${relativePath} should exist.`);
}

for (const relativeRoot of businessRoots) {
  for (const filePath of walk(join(root, relativeRoot))) {
    const relativePath = filePath.slice(root.length + 1).replaceAll('\\', '/');
    const source = read(relativePath);
    for (const phrase of bannedPhrases) {
      assert(!source.includes(phrase), `${relativePath} should not contain "${phrase}".`);
    }
  }
}

const hubUpload = read('apps/tablet/src/components/hub/WarmHubUploadDialog.vue');
const filePanel = read('apps/tablet/src/components/upload/WarmFileSelectionPanel.vue');
const camera = read('apps/tablet/src/components/upload/WarmCameraCaptureDialog.vue');
const packageJson = read('package.json');

assert(hubUpload.includes('上传资料'), 'Unified upload dialog should use production upload copy.');
assert(hubUpload.includes('客户') && hubUpload.includes('产品型号') && hubUpload.includes('当前模块'), 'Upload dialog should show customer, product and module context.');
assert(filePanel.includes('仅支持 PDF、JPG、PNG 和 WEBP 文件'), 'File panel should show production file type copy.');
assert(camera.includes('无法使用摄像头') && camera.includes('当前设备未检测到可用摄像头'), 'Camera component should show production camera error copy.');
assert(!/测试|护栏|沙盒|HL_REAL_DATA_TEST/.test(hubUpload + filePanel + camera), 'Current upload UI should not contain test guard copy.');
assert(packageJson.includes('"real-upload-ui:check": "node scripts/real-upload-ui-check.mjs"'), 'Root package.json should expose real-upload-ui:check.');

if (blockers.length) {
  console.error('Real upload UI check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('Real upload UI check passed.');
