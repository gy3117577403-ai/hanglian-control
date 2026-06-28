import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = process.cwd();
const apiPort = Number(process.env.TABLET_PRODUCTION_API_PORT ?? 3106);
const previewPort = Number(process.env.TABLET_PRODUCTION_PREVIEW_PORT ?? 5178);
const chromePort = Number(process.env.TABLET_PRODUCTION_CHROME_PORT ?? 9338);
const apiBase = `http://127.0.0.1:${apiPort}/api`;
const tabletUrl = `http://127.0.0.1:${previewPort}/tablet`;
const demoUploadFilePath = join(root, 'demo-upload-assets/demo-drawing-rev-a.pdf');
const viewports = [
  { width: 1280, height: 800, label: '1280x800' },
  { width: 1366, height: 768, label: '1366x768' },
  { width: 1920, height: 1200, label: '1920x1200' },
];
const failures = [];
const pageErrors = [];
const processes = [];
let chromeUserDataDir;
let commandId = 0;
let socket;

function fail(message) {
  failures.push(message);
}

function isIgnorableBrowserError(text) {
  return /favicon\.ico|\.map\b|ERR_ABORTED/i.test(text);
}

function commandForNpm(args) {
  if (process.platform === 'win32') return { command: 'cmd.exe', args: ['/d', '/s', '/c', ['npm', ...args].join(' ')] };
  return { command: 'npm', args };
}

function ensureDemoUploadAsset() {
  if (existsSync(demoUploadFilePath)) return;
  const npm = commandForNpm(['run', 'demo:assets']);
  const result = spawnSync(npm.command, npm.args, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(`Could not generate demo upload asset for production preview check: exit ${result.status ?? 'unknown'}.`);
  }
}

function runBuild() {
  const npm = commandForNpm(['run', 'build', '-w', 'tablet']);
  const env = { ...process.env };
  if (apiPort !== 3000) env.VITE_API_BASE_URL = apiBase;
  console.log(`$ npm run build -w tablet${apiPort !== 3000 ? ` (VITE_API_BASE_URL=${apiBase})` : ''}`);
  const result = spawnSync(npm.command, npm.args, {
    cwd: root,
    env,
    encoding: 'utf8',
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.status !== 0) throw new Error(`Tablet production build failed with exit code ${result.status ?? 'unknown'}.`);
}

function findChrome() {
  const candidates = process.platform === 'win32'
    ? [
        `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
        `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`,
        `${process.env.ProgramFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
        `${process.env['ProgramFiles(x86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
      ]
    : [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
      ];
  return candidates.find((candidate) => candidate && existsSync(candidate));
}

function spawnManaged(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: root,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    ...options,
  });
  processes.push(child);
  let output = '';
  child.stdout?.on('data', (chunk) => {
    output += chunk.toString();
    if (output.length > 5000) output = output.slice(-5000);
  });
  child.stderr?.on('data', (chunk) => {
    output += chunk.toString();
    if (output.length > 5000) output = output.slice(-5000);
  });
  child.latestOutput = () => output;
  return child;
}

function stopProcesses() {
  for (const child of processes.reverse()) {
    if (!child || child.killed) continue;
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        encoding: 'utf8',
        stdio: 'ignore',
        windowsHide: true,
      });
    } else {
      child.kill('SIGTERM');
    }
  }
  if (chromeUserDataDir) rmSync(chromeUserDataDir, { force: true, recursive: true });
}

async function waitForUrl(url, label, timeoutMs = 45000) {
  const start = Date.now();
  let lastError = '';
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return true;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 700));
  }
  throw new Error(`${label} did not become ready: ${lastError}`);
}

async function isApiRunning() {
  try {
    const response = await fetch(`${apiBase}/health`, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch {
    return false;
  }
}

async function startApiIfNeeded() {
  if (await isApiRunning()) {
    console.log(`API ready: ${apiBase} (existing process)`);
    return null;
  }
  const npm = commandForNpm(['run', 'start', '-w', 'api']);
  const child = spawnManaged(npm.command, npm.args, {
    env: {
      ...process.env,
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      PORT: String(apiPort),
      API_PREFIX: 'api',
      DATA_SOURCE: 'mock',
      DB_TARGET: 'test',
      ALLOW_TEST_DB_CONNECT: 'false',
      ALLOW_PRISMA_WRITE: 'false',
      ALLOW_DESTRUCTIVE_DB_ACTIONS: 'false',
    },
  });
  try {
    await waitForUrl(`${apiBase}/health`, 'production preview Mock API');
  } catch (error) {
    if (child.latestOutput?.().trim()) {
      console.error('Recent production preview Mock API log:');
      console.error(child.latestOutput().trim());
    }
    throw error;
  }
  console.log(`API ready: ${apiBase} (sandbox process)`);
  return child;
}

function startPreview() {
  const npm = commandForNpm(['run', 'preview', '-w', 'tablet', '--', '--host', '127.0.0.1', '--port', String(previewPort), '--strictPort']);
  return spawnManaged(npm.command, npm.args);
}

function startChrome() {
  const chrome = findChrome();
  if (!chrome) throw new Error('Chrome or Edge executable was not found; cannot run production preview check.');
  chromeUserDataDir = join(tmpdir(), `hanglian-tablet-production-${Date.now()}`);
  mkdirSync(chromeUserDataDir, { recursive: true });
  return spawnManaged(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    `--remote-debugging-port=${chromePort}`,
    `--user-data-dir=${chromeUserDataDir}`,
    'about:blank',
  ]);
}

async function connectChrome() {
  await waitForUrl(`http://127.0.0.1:${chromePort}/json/version`, 'Chrome DevTools');
  let target;
  try {
    const response = await fetch(`http://127.0.0.1:${chromePort}/json/new?about:blank`, { method: 'PUT' });
    if (response.ok) target = await response.json();
  } catch {
    target = undefined;
  }
  if (!target?.webSocketDebuggerUrl) {
    const targets = await fetch(`http://127.0.0.1:${chromePort}/json/list`).then((response) => response.json());
    target = targets.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
  }
  if (!target?.webSocketDebuggerUrl) throw new Error('No Chrome page target websocket was available.');

  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolveOpen, rejectOpen) => {
    const timer = setTimeout(() => rejectOpen(new Error('Chrome DevTools websocket timeout.')), 8000);
    socket.addEventListener('open', () => {
      clearTimeout(timer);
      resolveOpen();
    }, { once: true });
    socket.addEventListener('error', () => {
      clearTimeout(timer);
      rejectOpen(new Error('Chrome DevTools websocket failed.'));
    }, { once: true });
  });

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.consoleAPICalled' && message.params?.type === 'error') {
      const text = message.params.args?.map((arg) => arg.value ?? arg.description ?? '').join(' ') ?? 'console error';
      if (!isIgnorableBrowserError(text)) pageErrors.push(text);
    }
    if (message.method === 'Log.entryAdded' && message.params?.entry?.level === 'error') {
      const entry = message.params.entry;
      const text = [entry.text, entry.url].filter(Boolean).join(' ');
      if (!isIgnorableBrowserError(text)) pageErrors.push(text || 'browser log error');
    }
  });
}

function send(method, params = {}) {
  const id = ++commandId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolveCommand, rejectCommand) => {
    const timer = setTimeout(() => {
      socket.removeEventListener('message', onMessage);
      rejectCommand(new Error(`CDP command timeout: ${method}`));
    }, 10000);
    function onMessage(event) {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      clearTimeout(timer);
      socket.removeEventListener('message', onMessage);
      if (message.error) rejectCommand(new Error(`${method} failed: ${JSON.stringify(message.error)}`));
      else resolveCommand(message.result);
    }
    socket.addEventListener('message', onMessage);
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(`Page evaluation failed: ${result.exceptionDetails.text}`);
  return result.result.value;
}

async function waitForExpression(expression, label, timeoutMs = 12000) {
  const start = Date.now();
  let value;
  while (Date.now() - start < timeoutMs) {
    value = await evaluate(expression);
    if (value) return value;
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error(`${label} did not become true. Last value: ${JSON.stringify(value)}`);
}

async function click(expression, label) {
  const clicked = await evaluate(`(() => { const el = ${expression}; if (!el) return false; el.click(); return true; })()`);
  if (!clicked) throw new Error(`Could not click ${label}.`);
  await new Promise((resolveWait) => setTimeout(resolveWait, 500));
}

async function setFileInput(selector, filePath, label) {
  const document = await send('DOM.getDocument', { depth: -1, pierce: true });
  const result = await send('DOM.querySelector', { nodeId: document.root.nodeId, selector });
  if (!result.nodeId) throw new Error(`Could not find file input for ${label}.`);
  await send('DOM.setFileInputFiles', { nodeId: result.nodeId, files: [filePath] });
  const changed = await evaluate(`(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    if (!input) return false;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  if (!changed) throw new Error(`Could not dispatch file input change for ${label}.`);
  await new Promise((resolveWait) => setTimeout(resolveWait, 650));
}

async function navigate(viewport = viewports[1]) {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.navigate', { url: tabletUrl });
  await waitForExpression('document.readyState === "complete" && document.body.innerText.includes("资料库")', 'production tablet page ready', 22000);
  await new Promise((resolveWait) => setTimeout(resolveWait, 1200));
}

async function assertNoOverflow(label, viewport = viewports[1]) {
  const metrics = await evaluate(`(() => ({
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
    scrollWidth: document.documentElement.scrollWidth,
    bodyText: document.body.innerText,
  }))()`);
  if (metrics.scrollWidth > metrics.width) fail(`${label} ${viewport.label} horizontal overflow: ${metrics.scrollWidth} > ${metrics.width}.`);
  if (metrics.width !== viewport.width || metrics.height !== viewport.height) {
    fail(`${label} ${viewport.label} viewport mismatch: ${metrics.width}x${metrics.height}.`);
  }
}

async function assertGlassAndA4(label, viewport = viewports[1]) {
  const result = await evaluate(`(() => {
    const shell = document.querySelector('.document-hub-shell');
    const content = document.querySelector('.hub-content');
    const search = document.querySelector('.hub-search');
    const moduleCards = [...document.querySelectorAll('.module-card')];
    const firstCard = moduleCards[0];
    const secondCard = moduleCards[1];
    const preview = firstCard?.querySelector('.preview-tile');
    const shellStyle = shell ? getComputedStyle(shell) : null;
    const contentStyle = content ? getComputedStyle(content) : null;
    const searchStyle = search ? getComputedStyle(search) : null;
    const cardStyle = firstCard ? getComputedStyle(firstCard) : null;
    const previewStyle = preview ? getComputedStyle(preview) : null;
    const firstRect = firstCard?.getBoundingClientRect();
    const secondRect = secondCard?.getBoundingClientRect();
    return {
      hasShellGlass: Boolean(shellStyle?.backgroundImage.includes('radial-gradient') && shellStyle?.perspective !== 'none'),
      hasContentGlass: Boolean(contentStyle?.backdropFilter !== 'none' || contentStyle?.webkitBackdropFilter !== 'none'),
      hasSearchGlass: Boolean(searchStyle?.backdropFilter !== 'none' || searchStyle?.webkitBackdropFilter !== 'none'),
      hasCardGlass: Boolean(cardStyle?.backdropFilter !== 'none' || cardStyle?.webkitBackdropFilter !== 'none'),
      hasPreviewGlass: Boolean(previewStyle?.backdropFilter !== 'none' || previewStyle?.webkitBackdropFilter !== 'none'),
      cardCount: moduleCards.length,
      actionButtonCount: document.querySelectorAll('.module-card .actions button').length,
      firstAspect: firstRect ? firstRect.width / firstRect.height : 0,
      sameRowPrimary: Boolean(firstRect && secondRect && Math.abs(firstRect.top - secondRect.top) < 8),
      primaryCardHeight: firstRect?.height ?? 0,
    };
  })()`);

  if (!result.hasShellGlass) fail(`${label} ${viewport.label} shell glass background is missing.`);
  if (!result.hasContentGlass) fail(`${label} ${viewport.label} content glass effect is missing.`);
  if (!result.hasSearchGlass) fail(`${label} ${viewport.label} search glass effect is missing.`);
  if (!result.hasCardGlass) fail(`${label} ${viewport.label} A4 card glass effect is missing.`);
  if (!result.hasPreviewGlass) fail(`${label} ${viewport.label} A4 preview glass effect is missing.`);
  if (result.cardCount < 2) fail(`${label} ${viewport.label} expected drawing and SOP A4 cards.`);
  if (result.actionButtonCount < 6) fail(`${label} ${viewport.label} compact upload/view/delete buttons are missing.`);
  if (Math.abs(result.firstAspect - (1 / 1.414)) > 0.08) {
    fail(`${label} ${viewport.label} A4 card aspect drifted: ${result.firstAspect.toFixed(3)}.`);
  }
  if (!result.sameRowPrimary) fail(`${label} ${viewport.label} original drawing and SOP should stay side by side.`);
  if (viewport.width <= 1366 && result.primaryCardHeight < 330) {
    fail(`${label} ${viewport.label} A4 card became too short for tablet use: ${result.primaryCardHeight}px.`);
  }
}

async function runChecks(viewport = viewports[1]) {
  await assertNoOverflow('Initial product screen', viewport);
  await assertGlassAndA4('Initial product screen', viewport);
  const initial = await evaluate(`(() => ({
    hasProduct: Boolean(document.querySelector('.product-hero h2')),
    moduleCards: document.querySelectorAll('.module-card').length,
    moduleActionButtons: document.querySelectorAll('.module-card .actions button').length,
  }))()`);
  if (!initial.hasProduct) fail('Production preview product hero is missing.');
  if (initial.moduleCards < 2) fail('Production preview expected drawing and SOP A4 module cards.');
  if (initial.moduleActionButtons < 6) fail('Production preview compact upload/view/delete buttons are missing.');

  await click('document.querySelector(".main-orb")', 'document hub orb');
  await click('document.querySelector(".orb-menu button:nth-child(2)")', 'connector mode');
  await waitForExpression('document.body.innerText.includes("连接器参数")', 'connector lazy view');
  await assertNoOverflow('Connector view', viewport);

  await click('document.querySelector(".main-orb")', 'document hub orb');
  await click('document.querySelector(".orb-menu button:nth-child(3)")', 'fixture mode');
  await waitForExpression('document.body.innerText.includes("治具参数")', 'fixture lazy view');
  await assertNoOverflow('Fixture view', viewport);

  await click('document.querySelector(".main-orb")', 'document hub orb');
  await click('document.querySelector(".orb-menu button:nth-child(1)")', 'drawing mode');
  await waitForExpression('Boolean(document.querySelector(".product-home"))', 'drawing product view restored');

  await click('document.querySelector(".module-card .actions button:nth-child(2)")', 'view all module items');
  await waitForExpression('Boolean(document.querySelector(".module-gallery"))', 'production module gallery visible');
  await click('document.querySelector(".gallery-head button")', 'back to product from gallery');
  await waitForExpression('Boolean(document.querySelector(".product-home"))', 'production back to product page');

  await click('document.querySelector(".module-card .actions button:nth-child(1)")', 'production module upload dialog');
  await waitForExpression(`(() => {
    const dialog = document.querySelector('.p-dialog');
    const disabledSubmit = [...document.querySelectorAll('.p-dialog-footer button')].some((button) => button.disabled);
    return Boolean(dialog && disabledSubmit && dialog.innerText.includes('文件检查') && document.querySelector('.real-data-guard input'));
  })()`, 'production upload dialog with disabled submit');
  await setFileInput('.p-dialog input[type="file"]', demoUploadFilePath, 'production demo PDF upload selection');
  await waitForExpression(`(() => {
    const dialog = document.querySelector('.p-dialog');
    const disabledSubmit = [...document.querySelectorAll('.p-dialog-footer button')].some((button) => button.disabled);
    const text = dialog?.innerText ?? '';
    return Boolean(dialog && disabledSubmit && text.includes('demo-drawing-rev-a.pdf') && text.includes('真实资料本机测试护栏'));
  })()`, 'production upload dialog remains guarded after file selection');
  await click('document.querySelector(".real-data-guard input")', 'production real-data upload guard acknowledgement');
  await waitForExpression(`(() => {
    const dialog = document.querySelector('.p-dialog');
    const enabledSubmit = [...document.querySelectorAll('.p-dialog-footer button')].some((button) => !button.disabled && button.innerText.includes('确认上传'));
    const text = dialog?.innerText ?? '';
    return Boolean(dialog && enabledSubmit && text.includes('demo-drawing-rev-a.pdf') && text.includes('文件检查') && text.includes('PDF') && document.querySelector('.real-data-guard.ready'));
  })()`, 'production upload dialog selected demo PDF summary');

  await click(`document.querySelector('.p-dialog-close-button, .p-dialog-header-close, .p-dialog [aria-label="Close"], .p-dialog [aria-label="关闭"]')`, 'close production upload dialog');
  await waitForExpression('!document.querySelector(".p-dialog")', 'production upload dialog closed before final screenshot');
  await assertNoOverflow('Final unobscured product screen', viewport);

  if (pageErrors.length) fail(`Production preview emitted browser error(s): ${pageErrors.slice(0, 3).join(' | ')}`);

  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const screenshotPath = join(root, `docs/generated/tablet-production-preview-${viewport.width}.png`);
  mkdirSync(dirname(screenshotPath), { recursive: true });
  writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
  return screenshotPath;
}

console.log('Tablet production preview check');
console.log('This check builds the tablet PWA, serves dist with vite preview, and drives Chrome through lazy-loaded tablet flows.');
console.log('Database connection or write operation: no.');

let screenshotPaths = [];

try {
  ensureDemoUploadAsset();
  runBuild();
  await startApiIfNeeded();
  const previewProcess = startPreview();
  try {
    await waitForUrl(`http://127.0.0.1:${previewPort}/tablet`, 'tablet production preview');
  } catch (error) {
    if (previewProcess.latestOutput?.().trim()) {
      console.error('Recent tablet production preview log:');
      console.error(previewProcess.latestOutput().trim());
    }
    throw error;
  }
  startChrome();
  await connectChrome();
  for (const viewport of viewports) {
    await navigate(viewport);
    screenshotPaths.push(await runChecks(viewport));
  }
} finally {
  if (socket) socket.close();
  stopProcesses();
}

if (failures.length) {
  console.error('\nTablet production preview check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

for (const screenshotPath of screenshotPaths) {
  console.log(`Saved production preview screenshot: ${resolve(screenshotPath)}`);
}
console.log('Tablet production preview check passed.');
