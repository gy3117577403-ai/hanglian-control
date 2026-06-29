#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const reportsDir = join(repoRoot, 'reports');
const logPath = join(reportsDir, 'harmony-device-qa.log');
const mdPath = join(reportsDir, 'harmony-device-qa.md');
const layoutPath = join(reportsDir, 'harmony-device-layout.json');
const hapPath = join(repoRoot, 'harmony-pad', 'entry', 'build', 'default', 'outputs', 'default', 'entry-default-signed.hap');
const bundleName = 'com.hanglian.pad';
const abilityName = 'EntryAbility';
const remoteLayoutPath = '/data/local/tmp/hanglian-device-qa-layout.json';
const maxBuffer = 64 * 1024 * 1024;

function findHdc() {
  const candidates = [
    process.env.HDC_PATH,
    'hdc',
    'C:\\Users\\DevEco Studio\\sdk\\default\\openharmony\\toolchains\\hdc.exe',
    'C:\\Users\\DevEco Studio\\sdk\\default\\hmscore\\toolchains\\hdc.exe',
    'C:\\Users\\DevEco Studio\\tools\\hdc\\hdc.exe'
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const result = spawnSync(candidate, ['version'], { encoding: 'utf8', timeout: 5000 });
      if (result.status === 0 || result.stdout || result.stderr) return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return '';
}

function run(hdc, args, options = {}) {
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

function writeReport(status, reason, details = {}) {
  mkdirSync(reportsDir, { recursive: true });
  const log = details.log ?? '';
  writeFileSync(logPath, log || reason || '', 'utf8');

  const lines = [
    '# Harmony Device QA',
    '',
    `- result: ${status}`,
    `- reason: ${reason || '-'}`,
    `- device: ${details.device ?? '-'}`,
    `- currentPage: ${details.pagePath ?? '-'}`,
    `- BUILD_INFO: ${details.buildInfo ?? '-'}`,
    `- FIELD_QA_RESULT: ${details.fieldResult ?? '-'}`,
    `- FIELD_UPLOAD_QA_RESULT: ${details.uploadResult ?? '-'}`,
    `- FIELD_MANUAL_UPLOAD_PAGE_RESULT: ${details.manualUploadPageResult ?? '-'}`,
    `- layout: ${layoutPath.replaceAll('\\', '/')}`,
    `- log: ${logPath.replaceAll('\\', '/')}`,
    ''
  ];
  if (Array.isArray(details.failedTests) && details.failedTests.length > 0) {
    lines.push('## 失败项', '');
    for (const item of details.failedTests) {
      lines.push(`- ${item.name}: ${item.message ?? item.status ?? '失败'}`);
    }
    lines.push('');
  }
  writeFileSync(mdPath, `${lines.join('\n')}\n`, 'utf8');
}

function parseTargets(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^\[/.test(line) && !/empty/i.test(line));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function parseFieldResult(log) {
  const matches = [...log.matchAll(/FIELD_QA_RESULT\s+({.+})/g)];
  if (matches.length === 0) return undefined;
  const raw = matches[matches.length - 1][1];
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function parseUploadResult(log) {
  const matches = [...log.matchAll(/FIELD_UPLOAD_QA_RESULT\s+({.+})/g)];
  if (matches.length === 0) return undefined;
  const raw = matches[matches.length - 1][1];
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function parseManualUploadPageResult(log) {
  const matches = [...log.matchAll(/FIELD_MANUAL_UPLOAD_PAGE_RESULT\s+({.+})/g)];
  if (matches.length === 0) return undefined;
  const raw = matches[matches.length - 1][1];
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function parseBuildInfo(log) {
  const matches = [...log.matchAll(/BUILD_INFO\s+({.+})/g)];
  if (matches.length === 0) return undefined;
  const raw = matches[matches.length - 1][1];
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function filterLog(log) {
  return log
    .split(/\r?\n/)
    .filter((line) => /HanglianPad|BUILD_INFO|FIELD_QA_RESULT|FIELD_UPLOAD_QA_RESULT|FIELD_MANUAL_UPLOAD_PAGE_RESULT|manual upload failed detail|upload failed detail|RuntimeError|JS_ERROR|TypeError|undefined is not callable|Http protocol error/i.test(line))
    .join('\n');
}

function readLayout() {
  return JSON.parse(readFileSync(layoutPath, 'utf8'));
}

function dumpLayout(hdc) {
  run(hdc, ['shell', 'uitest', 'dumpLayout', '-b', bundleName, '-p', remoteLayoutPath], { timeout: 20000 });
  run(hdc, ['file', 'recv', remoteLayoutPath, layoutPath], { timeout: 20000 });
  return readLayout();
}

function clickNode(hdc, node, fallback) {
  const center = boundsCenter(node?.attributes?.bounds) ?? fallback;
  if (!center) throw new Error(`Cannot click node: ${nodeText(node)}`);
  run(hdc, ['shell', 'uitest', 'uiInput', 'click', String(center.x), String(center.y)], { timeout: 10000 });
}

async function waitForPage(hdc, expectedPage, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let layout = dumpLayout(hdc);
  while (Date.now() < deadline) {
    if (pagePath(layout) === expectedPage) return layout;
    await sleep(1500);
    layout = dumpLayout(hdc);
  }
  return layout;
}

async function ensureWorkbench(hdc) {
  let layout = dumpLayout(hdc);
  const currentPage = pagePath(layout);
  if (currentPage === 'pages/WorkbenchPage') return layout;
  if (currentPage === 'pages/TestLabPage') return layout;

  if (currentPage === 'pages/LoginPage') {
    const loginButton = findButtonContainingText(layout, '登录') ?? findTextNode(layout, '登录', 'Button');
    clickNode(hdc, loginButton, { x: 1780, y: 1184 });
    layout = await waitForPage(hdc, 'pages/WorkbenchPage', 20000);
  }
  return layout;
}

async function ensureTestLab(hdc, layout) {
  if (pagePath(layout) === 'pages/TestLabPage') return layout;
  if (pagePath(layout) !== 'pages/WorkbenchPage') return layout;

  const hlNode = findTextNode(layout, 'HL');
  for (let index = 0; index < 5; index += 1) {
    clickNode(hdc, hlNode, { x: 122, y: 190 });
    await sleep(250);
  }
  return waitForPage(hdc, 'pages/TestLabPage', 10000);
}

async function waitForFieldResult(hdc, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let filtered = '';
  while (Date.now() < deadline) {
    const raw = run(hdc, ['shell', 'hilog', '-x', '-t', 'app'], { timeout: 30000 });
    filtered = filterLog(raw);
    const result = parseFieldResult(filtered);
    if (result) return { result, filtered };
    await sleep(5000);
  }
  return { result: undefined, filtered };
}

async function waitForQaResults(hdc, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let filtered = '';
  while (Date.now() < deadline) {
    const raw = run(hdc, ['shell', 'hilog', '-x', '-t', 'app'], { timeout: 30000 });
    filtered = filterLog(raw);
    const buildInfo = parseBuildInfo(filtered);
    const fieldResult = parseFieldResult(filtered);
    const uploadResult = parseUploadResult(filtered);
    if (buildInfo && fieldResult && uploadResult) {
      return { buildInfo, fieldResult, uploadResult, filtered };
    }
    await sleep(5000);
  }
  return {
    buildInfo: parseBuildInfo(filtered),
    fieldResult: parseFieldResult(filtered),
    uploadResult: parseUploadResult(filtered),
    filtered
  };
}

async function waitForManualUploadPageResult(hdc, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let filtered = '';
  while (Date.now() < deadline) {
    const raw = run(hdc, ['shell', 'hilog', '-x', '-t', 'app'], { timeout: 30000 });
    filtered = filterLog(raw);
    const result = parseManualUploadPageResult(filtered);
    if (result) return { result, filtered };
    await sleep(5000);
  }
  return { result: parseManualUploadPageResult(filtered), filtered };
}

async function waitForManualUploadPagePass(hdc, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let filtered = '';
  let result;
  while (Date.now() < deadline) {
    const raw = run(hdc, ['shell', 'hilog', '-x', '-t', 'app'], { timeout: 30000 });
    filtered = filterLog(raw);
    result = parseManualUploadPageResult(filtered);
    if (
      result &&
      result.filePickerPdfUpload === true &&
      result.filePickerPdfPreview === true &&
      result.cameraJpgUpload === true &&
      result.cameraJpgPreview === true
    ) {
      return { result, filtered };
    }
    await sleep(5000);
  }
  return { result, filtered };
}

async function revealUploadPageQaButtons(hdc) {
  let layout = dumpLayout(hdc);
  const title = findTextNode(layout, 'PDF / 图片资料上传');
  for (let index = 0; index < 5; index += 1) {
    clickNode(hdc, title, { x: 220, y: 72 });
    await sleep(250);
  }

  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    layout = dumpLayout(hdc);
    if (findButtonContainingText(layout, '生成测试PDF并上传') && findButtonContainingText(layout, '生成测试图片并上传')) {
      return layout;
    }
    await sleep(1000);
  }
  return layout;
}

async function main() {
  mkdirSync(reportsDir, { recursive: true });
  const hdc = findHdc();
  if (!hdc) {
    const reason = '真机自动测试未执行：未检测到 hdc 或设备。';
    writeReport('未执行', reason);
    console.log(reason);
    return;
  }

  let targets = [];
  try {
    targets = parseTargets(run(hdc, ['list', 'targets'], { timeout: 10000 }));
  } catch (error) {
    const reason = '真机自动测试未执行：hdc 无法读取设备。';
    writeReport('未执行', reason, { log: error.output ?? error.message });
    console.log(reason);
    return;
  }

  if (targets.length === 0) {
    const reason = '真机自动测试未执行：未检测到 hdc 或设备。';
    writeReport('未执行', reason);
    console.log(reason);
    return;
  }

  if (!existsSync(hapPath)) {
    const reason = `真机自动测试未执行：未找到 HAP：${hapPath}`;
    writeReport('未执行', reason, { device: targets[0] });
    console.log(reason);
    return;
  }

  let filteredLog = '';
  let layout;
  try {
    try {
      run(hdc, ['shell', 'hilog', '-r'], { timeout: 10000 });
    } catch {
      // Best effort only.
    }
    try {
      run(hdc, ['uninstall', bundleName], { timeout: 60000 });
    } catch {
      // It is fine if the app was not installed.
    }
    run(hdc, ['install', hapPath], { timeout: 120000 });
    run(hdc, ['shell', 'aa', 'start', '-b', bundleName, '-a', abilityName], { timeout: 30000 });
    await sleep(2500);
    layout = await ensureWorkbench(hdc);
    layout = await ensureTestLab(hdc, layout);

    if (pagePath(layout) !== 'pages/TestLabPage') {
      const reason = `真机自动测试未完成：未能进入 TestLabPage，当前页面 ${pagePath(layout) || 'unknown'}。`;
      const raw = run(hdc, ['shell', 'hilog', '-x', '-t', 'app'], { timeout: 30000 });
      filteredLog = filterLog(raw);
      writeReport('未完成', reason, { device: targets[0], pagePath: pagePath(layout), log: filteredLog });
      console.log(reason);
      process.exitCode = 1;
      return;
    }

    const startButton = undefined;
    clickNode(hdc, startButton, { x: 1953, y: 201 });
    const waitResult = await waitForQaResults(hdc, 210000);
    filteredLog = waitResult.filtered;

    if (/RuntimeError|JS_ERROR|undefined is not callable/i.test(filteredLog)) {
      writeReport('failed', 'Runtime error found in HiLog.', {
        device: targets[0],
        pagePath: 'pages/TestLabPage',
        buildInfo: waitResult.buildInfo ? JSON.stringify(waitResult.buildInfo) : '-',
        fieldResult: waitResult.fieldResult ? JSON.stringify(waitResult.fieldResult) : '-',
        uploadResult: waitResult.uploadResult ? JSON.stringify(waitResult.uploadResult) : '-',
        log: filteredLog
      });
      console.error('Device QA failed: runtime error found.');
      process.exitCode = 1;
      return;
    }

    if (!waitResult.buildInfo || !waitResult.fieldResult || !waitResult.uploadResult) {
      writeReport('incomplete', 'BUILD_INFO / FIELD_QA_RESULT / FIELD_UPLOAD_QA_RESULT was not captured.', {
        device: targets[0],
        pagePath: 'pages/TestLabPage',
        buildInfo: waitResult.buildInfo ? JSON.stringify(waitResult.buildInfo) : '-',
        fieldResult: waitResult.fieldResult ? JSON.stringify(waitResult.fieldResult) : '-',
        uploadResult: waitResult.uploadResult ? JSON.stringify(waitResult.uploadResult) : '-',
        log: filteredLog
      });
      console.log('Device QA did not complete: required QA log result not found.');
      process.exitCode = 1;
      return;
    }

    const failedTests = Array.isArray(waitResult.fieldResult.tests)
      ? waitResult.fieldResult.tests.filter((item) => item.status !== '\u901a\u8fc7')
      : [];
    const uploadPassed = waitResult.uploadResult.success === true &&
      waitResult.uploadResult.pngUpload === true &&
      waitResult.uploadResult.pngPreview === true &&
      waitResult.uploadResult.pdfUpload === true &&
      waitResult.uploadResult.pdfPreview === true;

    if (waitResult.fieldResult.success !== true || failedTests.length > 0 || !uploadPassed) {
      writeReport('failed', 'QA result contains failed items.', {
        device: targets[0],
        pagePath: 'pages/TestLabPage',
        buildInfo: JSON.stringify(waitResult.buildInfo),
        fieldResult: JSON.stringify(waitResult.fieldResult),
        uploadResult: JSON.stringify(waitResult.uploadResult),
        failedTests,
        log: filteredLog
      });
      console.error('Device QA failed: QA result contains failed tests.');
      process.exitCode = 1;
      return;
    }

    layout = dumpLayout(hdc);
    const recycleButton = undefined;
    clickNode(hdc, recycleButton, { x: 1228, y: 830 });
    layout = await waitForPage(hdc, 'pages/RecycleBinPage', 12000);
    if (pagePath(layout) !== 'pages/RecycleBinPage') {
      writeReport('failed', 'RecycleBinPage did not open.', {
        device: targets[0],
        pagePath: pagePath(layout),
        buildInfo: JSON.stringify(waitResult.buildInfo),
        fieldResult: 'success=true',
        uploadResult: JSON.stringify(waitResult.uploadResult),
        log: filteredLog
      });
      process.exitCode = 1;
      return;
    }

    let raw = run(hdc, ['shell', 'hilog', '-x', '-t', 'app'], { timeout: 30000 });
    filteredLog = filterLog(raw);
    if (/RuntimeError|JS_ERROR|undefined is not callable|RecycleBinPage\.ets/i.test(filteredLog)) {
      writeReport('failed', 'RecycleBinPage still produced an error in HiLog.', {
        device: targets[0],
        pagePath: 'pages/RecycleBinPage',
        buildInfo: JSON.stringify(waitResult.buildInfo),
        fieldResult: 'success=true',
        uploadResult: JSON.stringify(waitResult.uploadResult),
        log: filteredLog
      });
      process.exitCode = 1;
      return;
    }

    const backButton = undefined;
    clickNode(hdc, backButton, { x: 2150, y: 201 });
    layout = await waitForPage(hdc, 'pages/WorkbenchPage', 12000);

    const importButton = findButtonContainingText(layout, 'PDF') ?? findTextNode(layout, 'PDF');
    clickNode(hdc, importButton, { x: 285, y: 165 });
    layout = await waitForPage(hdc, 'pages/DocumentUploadPage', 12000);
    if (pagePath(layout) !== 'pages/DocumentUploadPage') {
      writeReport('failed', 'Import PDF button did not open DocumentUploadPage.', {
        device: targets[0],
        pagePath: pagePath(layout),
        buildInfo: JSON.stringify(waitResult.buildInfo),
        fieldResult: 'success=true',
        uploadResult: JSON.stringify(waitResult.uploadResult),
        log: filteredLog
      });
      process.exitCode = 1;
      return;
    }

    layout = await revealUploadPageQaButtons(hdc);
    const pdfQaButton = findButtonContainingText(layout, '生成测试PDF并上传');
    const imageQaButton = findButtonContainingText(layout, '生成测试图片并上传');
    if (!pdfQaButton || !imageQaButton) {
      writeReport('failed', 'DocumentUploadPage manual upload QA buttons were not revealed.', {
        device: targets[0],
        pagePath: pagePath(layout),
        buildInfo: JSON.stringify(waitResult.buildInfo),
        fieldResult: 'success=true',
        uploadResult: JSON.stringify(waitResult.uploadResult),
        log: filteredLog
      });
      process.exitCode = 1;
      return;
    }

    clickNode(hdc, pdfQaButton, { x: 690, y: 1180 });
    await waitForManualUploadPageResult(hdc, 160000);
    layout = dumpLayout(hdc);
    const nextImageQaButton = findButtonContainingText(layout, '生成测试图片并上传');
    clickNode(hdc, nextImageQaButton, { x: 1710, y: 1180 });
    const manualWaitResult = await waitForManualUploadPagePass(hdc, 180000);
    filteredLog = manualWaitResult.filtered;
    const manualUploadPassed = manualWaitResult.result &&
      manualWaitResult.result.filePickerPdfUpload === true &&
      manualWaitResult.result.filePickerPdfPreview === true &&
      manualWaitResult.result.cameraJpgUpload === true &&
      manualWaitResult.result.cameraJpgPreview === true;

    if (!manualUploadPassed) {
      writeReport('failed', 'DocumentUploadPage manual PDF/JPG upload QA did not pass.', {
        device: targets[0],
        pagePath: pagePath(layout),
        buildInfo: JSON.stringify(waitResult.buildInfo),
        fieldResult: 'success=true',
        uploadResult: JSON.stringify(waitResult.uploadResult),
        manualUploadPageResult: manualWaitResult.result ? JSON.stringify(manualWaitResult.result) : '-',
        log: filteredLog
      });
      process.exitCode = 1;
      return;
    }

    if (/RuntimeError|JS_ERROR|undefined is not callable|Http protocol error/i.test(filteredLog)) {
      writeReport('failed', 'Runtime or upload protocol error appeared after manual upload page QA.', {
        device: targets[0],
        pagePath: pagePath(layout),
        buildInfo: JSON.stringify(waitResult.buildInfo),
        fieldResult: 'success=true',
        uploadResult: JSON.stringify(waitResult.uploadResult),
        manualUploadPageResult: JSON.stringify(manualWaitResult.result),
        log: filteredLog
      });
      process.exitCode = 1;
      return;
    }

    writeReport('passed', 'BUILD_INFO, FIELD_QA_RESULT, FIELD_UPLOAD_QA_RESULT, FIELD_MANUAL_UPLOAD_PAGE_RESULT, RecycleBinPage, and DocumentUploadPage manual upload paths were verified.', {
      device: targets[0],
      pagePath: pagePath(layout),
      buildInfo: JSON.stringify(waitResult.buildInfo),
      fieldResult: 'success=true',
      uploadResult: JSON.stringify(waitResult.uploadResult),
      manualUploadPageResult: JSON.stringify(manualWaitResult.result),
      log: filteredLog
    });
    console.log('Device QA passed.');
    return;
  } catch (error) {
    const reason = 'hdc 安装、启动、UI 操作或抓取日志失败。';
    writeReport('失败', reason, {
      device: targets[0],
      pagePath: layout ? pagePath(layout) : '',
      log: `${filteredLog}\n${error.output ?? error.message}`
    });
    console.error('Device QA failed.');
    process.exitCode = 1;
  }
}

main();
