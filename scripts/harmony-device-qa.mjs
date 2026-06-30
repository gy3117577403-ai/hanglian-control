#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(fileURLToPath(import.meta.url)).endsWith('scripts')
  ? join(dirname(fileURLToPath(import.meta.url)), '..')
  : process.cwd();
const reportsDir = join(repoRoot, 'reports');
const logPath = join(reportsDir, 'harmony-device-qa.log');
const mdPath = join(reportsDir, 'harmony-device-qa.md');
const jsonPath = join(reportsDir, 'harmony-device-qa.json');
const layoutPath = join(reportsDir, 'harmony-device-layout.json');
const hapPath = join(repoRoot, 'harmony-pad', 'entry', 'build', 'default', 'outputs', 'default', 'entry-default-signed.hap');
const bundleName = 'com.hanglian.pad';
const abilityName = 'EntryAbility';
const moduleName = 'entry';
const remoteLayoutPath = '/data/local/tmp/hanglian-device-qa-layout.json';
const maxBuffer = 64 * 1024 * 1024;
const sourceCommit = process.env.HAP_SOURCE_COMMIT || git(['rev-parse', '--short', 'HEAD']);

const forbiddenLogPatterns = [
  /RuntimeError/i,
  /JS_ERROR/i,
  /TypeError/i,
  /undefined is not callable/i,
  /RecycleBinPage\.ets/i,
  /Click gesture judge reject/i,
  /Touch test result is empty/i,
  /17 Http protocol error/i,
  /Http protocol error/i
];

function git(args) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim();
}

function commandWorks(command) {
  try {
    const result = spawnSync(command, ['version'], {
      encoding: 'utf8',
      timeout: 5000,
      shell: false
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

function findOnPath() {
  const result = spawnSync('where.exe', ['hdc'], {
    encoding: 'utf8',
    timeout: 5000,
    shell: false
  });
  if (result.status !== 0) {
    return '';
  }
  const rows = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return rows.find((candidate) => commandWorks(candidate)) ?? '';
}

function findHdc() {
  if (process.env.HDC_PATH && process.env.HDC_PATH.trim().length > 0) {
    const hdcPath = process.env.HDC_PATH.trim();
    if (!commandWorks(hdcPath)) {
      throw new Error(`HDC_PATH is not executable: ${hdcPath}`);
    }
    return hdcPath;
  }

  const pathHdc = findOnPath();
  if (pathHdc.length > 0) {
    return pathHdc;
  }

  const candidates = [
    'C:\\Users\\DevEco Studio\\sdk\\default\\openharmony\\toolchains\\hdc.exe',
    'C:\\Users\\DevEco Studio\\sdk\\default\\hmscore\\toolchains\\hdc.exe',
    'C:\\Users\\DevEco Studio\\tools\\hdc\\hdc.exe'
  ];
  return candidates.find((candidate) => commandWorks(candidate)) ?? '';
}

function runRaw(hdc, args, options = {}) {
  try {
    return execFileSync(hdc, args, {
      encoding: 'utf8',
      timeout: options.timeout ?? 30000,
      maxBuffer,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    const next = new Error(output || error.message);
    next.output = output;
    throw next;
  }
}

function runTarget(hdc, target, args, options = {}) {
  return runRaw(hdc, ['-t', target, ...args], options);
}

function parseTargetRows(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^\[/.test(line) && !/empty/i.test(line));
}

function chooseTarget(hdc) {
  const rows = parseTargetRows(runRaw(hdc, ['list', 'targets'], { timeout: 10000 }));
  if (rows.length === 0) {
    throw new Error('hdc list targets returned empty.');
  }

  if (process.env.HDC_TARGET && process.env.HDC_TARGET.trim().length > 0) {
    return process.env.HDC_TARGET.trim();
  }

  try {
    const verboseRows = parseTargetRows(runRaw(hdc, ['list', 'targets', '-v'], { timeout: 10000 }));
    const usbReady = verboseRows.find((line) => /\bUSB\b/i.test(line) && /\bReady\b/i.test(line));
    if (usbReady) {
      return usbReady.split(/\s+/)[0];
    }
  } catch {
    // Fall back to normal target output.
  }

  return rows[0].split(/\s+/)[0];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mkdirReports() {
  mkdirSync(reportsDir, { recursive: true });
}

function formatJson(value) {
  return value ? JSON.stringify(value) : '-';
}

function writeReport(status, reason, details = {}) {
  mkdirReports();
  const log = details.log ?? '';
  writeFileSync(logPath, log || reason || '', 'utf8');

  const payload = {
    generatedAt: new Date().toISOString(),
    status,
    reason,
    hdc: details.hdc ?? '',
    device: details.device ?? '',
    hapPath,
    hapSourceCommit: sourceCommit,
    currentPage: details.pagePath ?? '',
    buildInfo: details.buildInfo ?? null,
    fieldQaResult: details.fieldResult ?? null,
    fieldUploadQaResult: details.uploadResult ?? null,
    fieldManualUploadPageResult: details.manualUploadPageResult ?? null,
    forbiddenSignals: details.forbiddenSignals ?? [],
    failedTests: details.failedTests ?? [],
    staticScan: details.staticScan ?? null,
    logPath,
    layoutPath
  };
  writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  const lines = [
    '# Harmony Device QA',
    '',
    `- result: ${status}`,
    `- reason: ${reason || '-'}`,
    `- hdc: ${details.hdc ?? '-'}`,
    `- device: ${details.device ?? '-'}`,
    `- HAP_SOURCE_COMMIT: ${sourceCommit}`,
    `- currentPage: ${details.pagePath ?? '-'}`,
    `- BUILD_INFO: ${formatJson(details.buildInfo)}`,
    `- FIELD_QA_RESULT: ${details.fieldResult ? `success=${details.fieldResult.success === true}` : '-'}`,
    `- FIELD_UPLOAD_QA_RESULT: ${formatJson(details.uploadResult)}`,
    `- FIELD_MANUAL_UPLOAD_PAGE_RESULT: ${formatJson(details.manualUploadPageResult)}`,
    `- forbiddenSignals: ${(details.forbiddenSignals ?? []).join(', ') || '-'}`,
    `- layout: ${layoutPath.replaceAll('\\', '/')}`,
    `- log: ${logPath.replaceAll('\\', '/')}`,
    ''
  ];
  writeFileSync(mdPath, `${lines.join('\n')}\n`, 'utf8');
}

function printSummary(status, reason, details = {}) {
  const lines = [
    '=== HARMONY_DEVICE_QA_RESULT_START ===',
    `status=${status}`,
    `reason=${reason}`,
    `hapSourceCommit=${sourceCommit}`,
    `buildInfo=${formatJson(details.buildInfo)}`,
    `fieldQaResult=${details.fieldResult ? `success=${details.fieldResult.success === true}` : '-'}`,
    `fieldUploadQaResult=${formatJson(details.uploadResult)}`,
    `fieldManualUploadPageResult=${formatJson(details.manualUploadPageResult)}`,
    `forbiddenSignals=${(details.forbiddenSignals ?? []).join(', ') || '-'}`,
    `report=${mdPath}`,
    '=== HARMONY_DEVICE_QA_RESULT_END ==='
  ];
  console.log(lines.join('\n'));
}

function fail(reason, details = {}) {
  writeReport('failed', reason, details);
  printSummary('failed', reason, details);
  process.exitCode = 1;
}

function pass(reason, details = {}) {
  writeReport('passed', reason, details);
  printSummary('passed', reason, details);
}

function boundsCenter(bounds) {
  const match = String(bounds ?? '').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return undefined;
  const left = Number.parseInt(match[1], 10);
  const top = Number.parseInt(match[2], 10);
  const right = Number.parseInt(match[3], 10);
  const bottom = Number.parseInt(match[4], 10);
  return {
    x: Math.round((left + right) / 2),
    y: Math.round((top + bottom) / 2)
  };
}

function collectNodes(node, rows = []) {
  if (!node || typeof node !== 'object') return rows;
  rows.push(node);
  const children = Array.isArray(node.children) ? node.children : [];
  for (const child of children) collectNodes(child, rows);
  return rows;
}

function nodeText(node) {
  const attrs = node?.attributes ?? {};
  return String(attrs.originalText || attrs.text || '');
}

function nodeType(node) {
  return String(node?.attributes?.type || '');
}

function pagePath(layout) {
  const root = collectNodes(layout).find((node) => String(node?.attributes?.pagePath ?? '').length > 0);
  return String(root?.attributes?.pagePath ?? '');
}

function findTextNode(layout, text, type = '') {
  return collectNodes(layout).find((node) => {
    const hitText = nodeText(node).includes(text);
    const hitType = !type || nodeType(node) === type;
    return hitText && hitType;
  });
}

function findButtonContainingText(layout, text) {
  return collectNodes(layout).find((node) => {
    if (nodeType(node) !== 'Button') return false;
    return collectNodes(node).some((child) => nodeText(child).includes(text));
  });
}

function keepDeviceAwake(hdc, target) {
  try {
    runTarget(hdc, target, ['shell', 'power-shell', 'wakeup'], { timeout: 10000 });
  } catch {
    // Best effort only; older devices may not expose power-shell.
  }
  try {
    runTarget(hdc, target, ['shell', 'power-shell', 'timeout', '-o', '900000'], { timeout: 10000 });
  } catch {
    // Best effort only; foreground checks below still guard clicks.
  }
}

function restoreDeviceTimeout(hdc, target) {
  try {
    runTarget(hdc, target, ['shell', 'power-shell', 'timeout', '-r'], { timeout: 10000 });
  } catch {
    // Keep cleanup best effort so it never hides the QA result.
  }
}

function appIsForeground(hdc, target) {
  try {
    const dump = runTarget(hdc, target, ['shell', 'aa', 'dump', '-l'], { timeout: 30000 });
    const marker = `bundle name [${bundleName}]`;
    const index = dump.indexOf(marker);
    if (index < 0) return false;
    const block = dump.slice(Math.max(0, index - 300), index + 500);
    return /state #FOREGROUND/.test(block) && /app state #FOREGROUND/.test(block);
  } catch {
    return false;
  }
}

function ensureAppForeground(hdc, target) {
  keepDeviceAwake(hdc, target);
  if (appIsForeground(hdc, target)) return;
  runTarget(hdc, target, ['shell', 'aa', 'start', '-b', bundleName, '-a', abilityName, '-m', moduleName], { timeout: 30000 });
}

function clickNode(hdc, target, node, fallback) {
  ensureAppForeground(hdc, target);
  const center = boundsCenter(node?.attributes?.bounds) ?? fallback;
  if (!center) {
    throw new Error(`Cannot click node: ${nodeText(node)}`);
  }
  runTarget(hdc, target, ['shell', 'uitest', 'uiInput', 'click', String(center.x), String(center.y)], { timeout: 10000 });
}

function readLayout() {
  return JSON.parse(readFileSync(layoutPath, 'utf8'));
}

function dumpLayout(hdc, target) {
  runTarget(hdc, target, ['shell', 'uitest', 'dumpLayout', '-b', bundleName, '-p', remoteLayoutPath], { timeout: 20000 });
  runTarget(hdc, target, ['file', 'recv', remoteLayoutPath, layoutPath], { timeout: 20000 });
  return readLayout();
}

async function waitForPage(hdc, target, expectedPage, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let layout = dumpLayout(hdc, target);
  while (Date.now() < deadline) {
    if (pagePath(layout) === expectedPage) return layout;
    await sleep(1200);
    layout = dumpLayout(hdc, target);
  }
  return layout;
}

function readNewLog(hdc, target) {
  return runTarget(hdc, target, ['shell', 'hilog', '-x', '-t', 'app'], { timeout: 30000 });
}

function filterLog(log) {
  return log
    .split(/\r?\n/)
    .filter((line) => /HanglianPad|BUILD_INFO|FIELD_QA_RESULT|FIELD_UPLOAD_QA_RESULT|FIELD_MANUAL_UPLOAD_PAGE_RESULT|manual upload failed detail|upload failed detail|RuntimeError|JS_ERROR|TypeError|undefined is not callable|RecycleBinPage\.ets|Click gesture judge reject|Touch test result is empty|17 Http protocol error|Http protocol error/i.test(line))
    .join('\n');
}

function forbiddenSignals(log) {
  return forbiddenLogPatterns
    .filter((pattern) => pattern.test(log))
    .map((pattern) => pattern.source.replaceAll('\\', ''));
}

function parseLastJson(log, marker) {
  const expression = new RegExp(`${marker}\\s+({.+})`, 'g');
  const matches = [...log.matchAll(expression)];
  if (matches.length === 0) return undefined;
  const raw = matches[matches.length - 1][1];
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function parseBuildInfo(log) {
  return parseLastJson(log, 'BUILD_INFO');
}

function parseFieldResult(log) {
  return parseLastJson(log, 'FIELD_QA_RESULT');
}

function parseUploadResult(log) {
  return parseLastJson(log, 'FIELD_UPLOAD_QA_RESULT');
}

function parseManualUploadPageResult(log) {
  return parseLastJson(log, 'FIELD_MANUAL_UPLOAD_PAGE_RESULT');
}

async function waitForBuildInfo(hdc, target, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let filtered = '';
  while (Date.now() < deadline) {
    filtered = filterLog(readNewLog(hdc, target));
    const buildInfo = parseBuildInfo(filtered);
    if (buildInfo) return { buildInfo, filtered };
    await sleep(1500);
  }
  return { buildInfo: parseBuildInfo(filtered), filtered };
}

async function waitForQaResults(hdc, target, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let filtered = '';
  while (Date.now() < deadline) {
    filtered = filterLog(readNewLog(hdc, target));
    const fieldResult = parseFieldResult(filtered);
    const uploadResult = parseUploadResult(filtered);
    if (fieldResult && uploadResult) {
      return { fieldResult, uploadResult, filtered };
    }
    await sleep(5000);
  }
  return {
    fieldResult: parseFieldResult(filtered),
    uploadResult: parseUploadResult(filtered),
    filtered
  };
}

async function waitForManualUploadPageResult(hdc, target, timeoutMs, predicate) {
  const deadline = Date.now() + timeoutMs;
  let filtered = '';
  let result;
  while (Date.now() < deadline) {
    filtered = filterLog(readNewLog(hdc, target));
    result = parseManualUploadPageResult(filtered);
    if (result && predicate(result)) {
      return { result, filtered };
    }
    await sleep(5000);
  }
  return { result, filtered };
}

async function waitForManualUploadPagePass(hdc, target, timeoutMs) {
  return waitForManualUploadPageResult(hdc, target, timeoutMs, (result) => (
    result.filePickerPdfUpload === true &&
    result.filePickerPdfPreview === true &&
    result.cameraJpgUpload === true &&
    result.cameraJpgPreview === true
  ));
}

function staticScan() {
  const files = [
    join(repoRoot, 'harmony-pad', 'entry', 'src', 'main', 'ets', 'pages', 'WorkbenchPage.ets'),
    join(repoRoot, 'harmony-pad', 'entry', 'src', 'main', 'ets', 'components', 'DocumentCategoryGrid.ets'),
    join(repoRoot, 'harmony-pad', 'entry', 'src', 'main', 'ets', 'pages', 'RecycleBinPage.ets')
  ];
  const gridHits = [];
  const unsafeForEachHits = [];
  for (const file of files) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, 'utf8');
    if (/\bGrid\s*\(/.test(content)) {
      gridHits.push(file.replace(repoRoot, '').replaceAll('\\', '/'));
    }
    if (file.endsWith('RecycleBinPage.ets')) {
      if (/\.forEach\s*\(/.test(content)) unsafeForEachHits.push('array.forEach');
      if (/ForEach\s*\([^,]+,\s*this\./s.test(content)) unsafeForEachHits.push('ForEach itemGenerator uses this method reference');
      if (/ForEach\s*\([^,]+,[\s\S]*?,\s*this\./.test(content)) unsafeForEachHits.push('ForEach keyGenerator uses this method reference');
      if (!/@State\s+private\s+recycleItems\s*:\s*RecycleBinItem\[\]\s*=\s*\[\]/.test(content)) {
        unsafeForEachHits.push('recycleItems is not initialized as []');
      }
    }
  }
  return {
    passed: gridHits.length === 0 && unsafeForEachHits.length === 0,
    gridHits,
    unsafeForEachHits
  };
}

async function clickLogin(hdc, target) {
  let layout = await waitForPage(hdc, target, 'pages/LoginPage', 12000);
  if (pagePath(layout) === 'pages/WorkbenchPage') return layout;
  if (pagePath(layout) !== 'pages/LoginPage') {
    throw new Error(`Expected LoginPage, got ${pagePath(layout) || 'unknown'}`);
  }
  const loginButton = findButtonContainingText(layout, '登录') ?? findTextNode(layout, '登录');
  clickNode(hdc, target, loginButton, { x: 1780, y: 1184 });
  layout = await waitForPage(hdc, target, 'pages/WorkbenchPage', 25000);
  if (pagePath(layout) !== 'pages/WorkbenchPage') {
    throw new Error(`Login did not enter WorkbenchPage, got ${pagePath(layout) || 'unknown'}`);
  }
  return layout;
}

async function enterTestLab(hdc, target, layout) {
  let current = layout;
  if (pagePath(current) !== 'pages/WorkbenchPage') {
    current = await waitForPage(hdc, target, 'pages/WorkbenchPage', 12000);
  }
  const logo = findTextNode(current, 'HL');
  for (let index = 0; index < 5; index += 1) {
    clickNode(hdc, target, logo, { x: 122, y: 190 });
    await sleep(250);
  }
  current = await waitForPage(hdc, target, 'pages/TestLabPage', 12000);
  if (pagePath(current) !== 'pages/TestLabPage') {
    throw new Error(`Could not enter TestLabPage, got ${pagePath(current) || 'unknown'}`);
  }
  return current;
}

async function returnWorkbench(hdc, target, layout) {
  const backButton = findButtonContainingText(layout, '返回工作台') ?? findTextNode(layout, '返回工作台');
  clickNode(hdc, target, backButton, { x: 2150, y: 201 });
  const next = await waitForPage(hdc, target, 'pages/WorkbenchPage', 15000);
  if (pagePath(next) !== 'pages/WorkbenchPage') {
    throw new Error(`Return workbench failed, got ${pagePath(next) || 'unknown'}`);
  }
  return next;
}

async function verifyConnectorNavigation(hdc, target, layout) {
  const button = findButtonContainingText(layout, '连接器参数') ?? findTextNode(layout, '连接器参数');
  clickNode(hdc, target, button, { x: 1020, y: 166 });
  let next = await waitForPage(hdc, target, 'pages/ConnectorParamPage', 15000);
  if (pagePath(next) !== 'pages/ConnectorParamPage') {
    throw new Error(`ConnectorParamPage did not open, got ${pagePath(next) || 'unknown'}`);
  }
  next = await returnWorkbench(hdc, target, next);
  return next;
}

async function verifyRecycleBin(hdc, target, layout) {
  const button = findButtonContainingText(layout, '回收站') ?? findTextNode(layout, '回收站');
  clickNode(hdc, target, button, { x: 1228, y: 166 });
  let next = await waitForPage(hdc, target, 'pages/RecycleBinPage', 15000);
  if (pagePath(next) !== 'pages/RecycleBinPage') {
    throw new Error(`RecycleBinPage did not open, got ${pagePath(next) || 'unknown'}`);
  }
  await sleep(2500);
  const filtered = filterLog(readNewLog(hdc, target));
  const signals = forbiddenSignals(filtered);
  if (signals.length > 0) {
    const error = new Error('RecycleBinPage produced forbidden HiLog signals.');
    error.filteredLog = filtered;
    error.forbiddenSignals = signals;
    throw error;
  }
  next = await returnWorkbench(hdc, target, next);
  return next;
}

async function revealUploadPageQaButtons(hdc, target) {
  let layout = dumpLayout(hdc, target);
  const title = findTextNode(layout, 'PDF / 图片资料上传') ?? findTextNode(layout, '资料上传');
  for (let index = 0; index < 5; index += 1) {
    clickNode(hdc, target, title, { x: 220, y: 72 });
    await sleep(250);
  }

  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    layout = dumpLayout(hdc, target);
    if (findButtonContainingText(layout, '生成测试PDF并上传') && findButtonContainingText(layout, '生成测试图片并上传')) {
      return layout;
    }
    await sleep(1000);
  }
  return layout;
}

async function verifyManualUploadPage(hdc, target, layout) {
  const button = pagePath(layout) === 'pages/TestLabPage'
    ? (findButtonContainingText(layout, '打开上传页') ?? findTextNode(layout, '打开上传页'))
    : (findButtonContainingText(layout, '导入 PDF 图纸') ?? findTextNode(layout, 'PDF'));
  clickNode(hdc, target, button, pagePath(layout) === 'pages/TestLabPage' ? { x: 2180, y: 760 } : { x: 285, y: 166 });
  let next = await waitForPage(hdc, target, 'pages/DocumentUploadPage', 15000);
  if (pagePath(next) !== 'pages/DocumentUploadPage') {
    throw new Error(`DocumentUploadPage did not open, got ${pagePath(next) || 'unknown'}`);
  }

  next = await revealUploadPageQaButtons(hdc, target);
  const pdfButton = findButtonContainingText(next, '生成测试PDF并上传');
  const imageButton = findButtonContainingText(next, '生成测试图片并上传');
  if (!pdfButton || !imageButton) {
    throw new Error('DocumentUploadPage manual upload QA buttons were not revealed.');
  }

  clickNode(hdc, target, pdfButton, { x: 690, y: 1180 });
  const pdfWait = await waitForManualUploadPageResult(hdc, target, 180000, (result) => (
    result.filePickerPdfUpload === true &&
    result.filePickerPdfPreview === true
  ));
  let signals = forbiddenSignals(pdfWait.filtered);
  if (signals.length > 0) {
    const error = new Error('Manual upload page produced forbidden HiLog signals.');
    error.filteredLog = pdfWait.filtered;
    error.forbiddenSignals = signals;
    error.manualUploadPageResult = pdfWait.result;
    throw error;
  }
  if (!pdfWait.result || pdfWait.result.filePickerPdfUpload !== true || pdfWait.result.filePickerPdfPreview !== true) {
    const error = new Error('DocumentUploadPage PDF manual upload QA did not pass.');
    error.filteredLog = pdfWait.filtered;
    error.manualUploadPageResult = pdfWait.result;
    throw error;
  }

  next = dumpLayout(hdc, target);
  const nextImageButton = findButtonContainingText(next, '生成测试图片并上传') ?? imageButton;
  clickNode(hdc, target, nextImageButton, { x: 1710, y: 1180 });
  const waitResult = await waitForManualUploadPagePass(hdc, target, 240000);
  signals = forbiddenSignals(waitResult.filtered);
  if (signals.length > 0) {
    const error = new Error('Manual upload page produced forbidden HiLog signals.');
    error.filteredLog = waitResult.filtered;
    error.forbiddenSignals = signals;
    error.manualUploadPageResult = waitResult.result;
    throw error;
  }
  if (!waitResult.result) {
    const error = new Error('FIELD_MANUAL_UPLOAD_PAGE_RESULT was not captured.');
    error.filteredLog = waitResult.filtered;
    throw error;
  }
  return { layout: dumpLayout(hdc, target), manualUploadPageResult: waitResult.result, filtered: waitResult.filtered };
}

async function main() {
  mkdirReports();
  const scan = staticScan();
  if (!scan.passed) {
    fail('Static scan failed: Grid or unsafe RecycleBin ForEach is still present.', { staticScan: scan });
    return;
  }

  let hdc = '';
  let target = '';
  let filteredLog = '';
  let buildInfo;
  let fieldResult;
  let uploadResult;
  let manualUploadPageResult;
  let layout;

  try {
    hdc = findHdc();
    if (!hdc) {
      fail('hdc executable was not found.', { staticScan: scan });
      return;
    }

    target = chooseTarget(hdc);
    keepDeviceAwake(hdc, target);
    if (!existsSync(hapPath)) {
      fail(`Current HAP was not found: ${hapPath}`, { hdc, device: target, staticScan: scan });
      return;
    }

    try {
      runTarget(hdc, target, ['shell', 'hilog', '-r'], { timeout: 10000 });
    } catch {
      // Clear is best effort before uninstall; we clear again before launch.
    }

    try {
      runTarget(hdc, target, ['uninstall', bundleName], { timeout: 60000 });
    } catch {
      // The app may not be installed.
    }
    runTarget(hdc, target, ['install', hapPath], { timeout: 120000 });
    runTarget(hdc, target, ['shell', 'hilog', '-r'], { timeout: 10000 });
    runTarget(hdc, target, ['shell', 'aa', 'start', '-b', bundleName, '-a', abilityName, '-m', moduleName], { timeout: 30000 });

    const buildWait = await waitForBuildInfo(hdc, target, 30000);
    buildInfo = buildWait.buildInfo;
    filteredLog = buildWait.filtered;
    let signals = forbiddenSignals(filteredLog);
    if (signals.length > 0) {
      fail('Forbidden HiLog signal appeared during startup.', { hdc, device: target, buildInfo, forbiddenSignals: signals, log: filteredLog, staticScan: scan });
      return;
    }
    if (!buildInfo) {
      fail('BUILD_INFO was not captured after app startup.', { hdc, device: target, log: filteredLog, staticScan: scan });
      return;
    }
    if (buildInfo.commit !== sourceCommit) {
      fail(`BUILD_INFO.commit ${buildInfo.commit} does not match HAP_SOURCE_COMMIT ${sourceCommit}.`, { hdc, device: target, buildInfo, log: filteredLog, staticScan: scan });
      return;
    }

    layout = await clickLogin(hdc, target);
    layout = await enterTestLab(hdc, target, layout);
    const startButton = findButtonContainingText(layout, '一键真机自检') ?? findTextNode(layout, '一键真机自检');
    clickNode(hdc, target, startButton, { x: 1953, y: 201 });
    const qaWait = await waitForQaResults(hdc, target, 240000);
    filteredLog = qaWait.filtered;
    fieldResult = qaWait.fieldResult;
    uploadResult = qaWait.uploadResult;
    signals = forbiddenSignals(filteredLog);
    if (signals.length > 0) {
      fail('Forbidden HiLog signal appeared during TestLab QA.', { hdc, device: target, buildInfo, fieldResult, uploadResult, forbiddenSignals: signals, log: filteredLog, staticScan: scan });
      return;
    }
    if (!fieldResult || !uploadResult) {
      fail('FIELD_QA_RESULT or FIELD_UPLOAD_QA_RESULT was not captured.', { hdc, device: target, buildInfo, fieldResult, uploadResult, log: filteredLog, staticScan: scan });
      return;
    }
    const failedTests = Array.isArray(fieldResult.tests)
      ? fieldResult.tests.filter((item) => item.status !== '通过')
      : [];
    const uploadPassed = uploadResult.success === true &&
      uploadResult.pngUpload === true &&
      uploadResult.pngPreview === true &&
      uploadResult.pdfUpload === true &&
      uploadResult.pdfPreview === true;
    if (fieldResult.success !== true || failedTests.length > 0 || !uploadPassed) {
      fail('FIELD QA result contains failed items.', { hdc, device: target, buildInfo, fieldResult, uploadResult, failedTests, log: filteredLog, staticScan: scan });
      return;
    }

    layout = dumpLayout(hdc, target);
    const manualResult = await verifyManualUploadPage(hdc, target, layout);
    manualUploadPageResult = manualResult.manualUploadPageResult;
    filteredLog = manualResult.filtered;
    layout = await returnWorkbench(hdc, target, manualResult.layout);
    layout = await verifyConnectorNavigation(hdc, target, layout);
    layout = await verifyRecycleBin(hdc, target, layout);
    filteredLog = filterLog(readNewLog(hdc, target));

    signals = forbiddenSignals(filteredLog);
    if (signals.length > 0) {
      fail('Forbidden HiLog signal appeared in final log.', { hdc, device: target, buildInfo, fieldResult, uploadResult, manualUploadPageResult, forbiddenSignals: signals, log: filteredLog, staticScan: scan });
      return;
    }

    pass('Device QA passed with current HAP and fresh HiLog.', {
      hdc,
      device: target,
      pagePath: pagePath(layout),
      buildInfo,
      fieldResult,
      uploadResult,
      manualUploadPageResult,
      forbiddenSignals: [],
      log: filteredLog,
      staticScan: scan
    });
  } catch (error) {
    const signals = forbiddenSignals(`${filteredLog}\n${error.filteredLog ?? ''}\n${error.output ?? ''}\n${error.message ?? ''}`);
    fail(error.message || 'Device QA failed.', {
      hdc,
      device: target,
      pagePath: layout ? pagePath(layout) : '',
      buildInfo,
      fieldResult,
      uploadResult,
      manualUploadPageResult: error.manualUploadPageResult ?? manualUploadPageResult,
      forbiddenSignals: error.forbiddenSignals ?? signals,
      log: `${filteredLog}\n${error.filteredLog ?? ''}\n${error.output ?? ''}\n${error.stack ?? error.message}`,
      staticScan: scan
    });
  } finally {
    if (hdc && target) {
      restoreDeviceTimeout(hdc, target);
    }
  }
}

main();
