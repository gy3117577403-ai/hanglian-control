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
    `- 结果：${status}`,
    `- 原因：${reason || '-'}`,
    `- 设备：${details.device ?? '-'}`,
    `- 当前页面：${details.pagePath ?? '-'}`,
    `- FIELD_QA_RESULT：${details.fieldResult ?? '-'}`,
    `- 布局：${layoutPath.replaceAll('\\', '/')}`,
    `- 日志：${logPath.replaceAll('\\', '/')}`,
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

function filterLog(log) {
  return log
    .split(/\r?\n/)
    .filter((line) => /HanglianPad|FIELD_QA_RESULT|RuntimeError|JS_ERROR|TypeError|undefined is not callable|Http protocol error/i.test(line))
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
    run(hdc, ['install', '-r', hapPath], { timeout: 120000 });
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

    const startButton = findButtonContainingText(layout, '一键真机自检') ?? findTextNode(layout, '一键真机自检', 'Button') ?? findTextNode(layout, '一键真机自检');
    clickNode(hdc, startButton, { x: 1953, y: 201 });
    const waitResult = await waitForFieldResult(hdc, 180000);
    filteredLog = waitResult.filtered;
    const hasRuntimeError = /RuntimeError|JS_ERROR|undefined is not callable|Http protocol error/i.test(filteredLog);
    if (hasRuntimeError) {
      writeReport('失败', 'HiLog 出现运行时错误。', {
        device: targets[0],
        pagePath: 'pages/TestLabPage',
        log: filteredLog
      });
      console.error('Device QA failed: runtime error found.');
      process.exitCode = 1;
      return;
    }

    if (!waitResult.result) {
      writeReport('未完成', '未检测到 FIELD_QA_RESULT。请在 MatePad 进入 TestLabPage 后重新运行。', {
        device: targets[0],
        pagePath: 'pages/TestLabPage',
        log: filteredLog
      });
      console.log('Device QA did not complete: FIELD_QA_RESULT not found.');
      process.exitCode = 1;
      return;
    }

    const failedTests = Array.isArray(waitResult.result.tests)
      ? waitResult.result.tests.filter((item) => item.status !== '通过')
      : [];
    if (waitResult.result.success === true && failedTests.length === 0) {
      writeReport('通过', '检测到 FIELD_QA_RESULT 且全部通过。', {
        device: targets[0],
        pagePath: 'pages/TestLabPage',
        fieldResult: 'success=true',
        log: filteredLog
      });
      console.log('Device QA passed.');
      return;
    }

    writeReport('失败', '检测到 FIELD_QA_RESULT，但存在失败项。', {
      device: targets[0],
      pagePath: 'pages/TestLabPage',
      fieldResult: 'success=false',
      failedTests,
      log: filteredLog
    });
    console.error('Device QA failed: FIELD_QA_RESULT contains failed tests.');
    process.exitCode = 1;
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
