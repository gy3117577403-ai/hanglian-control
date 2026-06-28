import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = process.cwd();
const apiPort = Number(process.env.TABLET_UI_API_PORT ?? 3104);
const tabletPort = Number(process.env.TABLET_UI_PORT ?? 5177);
const chromePort = Number(process.env.TABLET_UI_CHROME_PORT ?? 9337);
const apiBase = `http://127.0.0.1:${apiPort}/api`;
const tabletUrl = `http://127.0.0.1:${tabletPort}/tablet`;
const screenshotPath = join(root, 'docs/generated/tablet-ui-interaction-1366.png');
const orbMenuScreenshotPath = join(root, 'docs/generated/tablet-ui-interaction-orb-menu-open-1366.png');
const demoUploadFilePath = join(root, 'demo-upload-assets/demo-drawing-rev-a.pdf');
const orderToggleBudgetMs = 300;
const failures = [];
const processes = [];
let chromeUserDataDir;
let commandId = 0;
let socket;

function log(message) {
  console.log(message);
}

function fail(message) {
  failures.push(message);
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
    throw new Error(`Could not generate demo upload asset for browser interaction check: exit ${result.status ?? 'unknown'}.`);
  }
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
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 700));
  }
  throw new Error(`${label} did not become ready: ${lastError}`);
}

function startApi() {
  const npm = commandForNpm(['run', 'start', '-w', 'api']);
  return spawnManaged(npm.command, npm.args, {
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
}

function startTablet() {
  const npm = commandForNpm(['run', 'dev', '-w', 'tablet', '--', '--host', '127.0.0.1', '--port', String(tabletPort), '--strictPort']);
  return spawnManaged(npm.command, npm.args, {
    env: {
      ...process.env,
      VITE_API_BASE_URL: apiBase,
    },
  });
}

function startChrome() {
  const chrome = findChrome();
  if (!chrome) throw new Error('Chrome or Edge executable was not found; cannot run browser interaction check.');
  chromeUserDataDir = join(tmpdir(), `hanglian-tablet-ui-${Date.now()}`);
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
  if (!target?.webSocketDebuggerUrl) {
    throw new Error('No Chrome page target websocket was available.');
  }
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
      if (message.error) {
        rejectCommand(new Error(`${method} failed: ${JSON.stringify(message.error)}`));
      } else {
        resolveCommand(message.result);
      }
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
  if (result.exceptionDetails) {
    throw new Error(`Page evaluation failed: ${result.exceptionDetails.text}`);
  }
  return result.result.value;
}

async function waitForExpression(expression, label, timeoutMs = 10000) {
  const start = Date.now();
  let value;
  while (Date.now() - start < timeoutMs) {
    value = await evaluate(expression);
    if (value) return value;
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error(`${label} did not become true. Last value: ${JSON.stringify(value)}`);
}

async function navigate() {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.navigate', { url: tabletUrl });
  await waitForExpression('document.readyState === "complete" && document.body.innerText.includes("资料库")', 'tablet page ready', 20000);
  await new Promise((resolveWait) => setTimeout(resolveWait, 1200));
}

async function click(expression, label) {
  const clicked = await evaluate(`(() => { const el = ${expression}; if (!el) return false; el.click(); return true; })()`);
  if (!clicked) throw new Error(`Could not click ${label}.`);
  await new Promise((resolveWait) => setTimeout(resolveWait, 450));
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

async function setInputValue(selector, value, label) {
  const changed = await evaluate(`(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    if (!input) return false;
    input.focus();
    input.value = ${JSON.stringify(value)};
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  if (!changed) throw new Error(`Could not set input value for ${label}.`);
  await new Promise((resolveWait) => setTimeout(resolveWait, 250));
}

async function runChecks() {
  const metrics = await evaluate(`(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    hasProduct: Boolean(document.querySelector('.product-hero h2')),
    moduleCards: document.querySelectorAll('.module-card').length,
    moduleActionButtons: document.querySelectorAll('.module-card .actions button').length,
  }))()`);
  if (metrics.scrollWidth > metrics.width) fail(`Horizontal overflow detected: ${metrics.scrollWidth} > ${metrics.width}.`);
  if (!metrics.hasProduct) fail('Product hero is missing after default order-driven load.');
  if (metrics.moduleCards < 2) fail('Expected at least drawing and SOP A4 module cards.');
  if (metrics.moduleActionButtons < 6) fail('A4 module cards are missing compact upload/view/delete buttons.');

  await click('document.querySelector(".main-orb")', 'document hub orb');
  const orbExpanded = await evaluate('document.querySelector(".orb-menu")?.getAttribute("aria-hidden") === "false"');
  if (!orbExpanded) fail('Function orb did not expand the document library menu.');
  const orbMenuLayout = await evaluate(`(() => {
    const menu = document.querySelector('.orb-menu')?.getBoundingClientRect();
    const search = document.querySelector('.hub-search')?.getBoundingClientRect();
    const order = document.querySelector('.order-sidebar')?.getBoundingClientRect();
    const header = document.querySelector('.hub-header')?.getBoundingClientRect();
    if (!menu || !search || !order || !header) return { ok: false };
    const overlaps = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
    return {
      ok: true,
      menuRightBeforeSearch: menu.right <= search.left - 4,
      menuInsideHeader: menu.top >= header.top - 2 && menu.bottom <= header.bottom + 2,
      overlapsOrder: overlaps(menu, order),
      overlapsSearch: overlaps(menu, search),
    };
  })()`);
  if (!orbMenuLayout.ok) fail('Function orb menu layout could not be measured.');
  if (!orbMenuLayout.menuRightBeforeSearch) fail('Function orb menu must expand beside the search box instead of being covered by it.');
  if (!orbMenuLayout.menuInsideHeader) fail('Function orb menu must stay inside the top toolbox instead of dropping into the order area.');
  if (orbMenuLayout.overlapsOrder) fail('Function orb menu must not overlap the left order sidebar.');
  if (orbMenuLayout.overlapsSearch) fail('Function orb menu must not overlap the search box.');
  const orbMenuScreenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  mkdirSync(dirname(orbMenuScreenshotPath), { recursive: true });
  writeFileSync(orbMenuScreenshotPath, Buffer.from(orbMenuScreenshot.data, 'base64'));
  await click('document.querySelector(".main-orb")', 'close document hub orb after layout check');

  const orderTogglePerf = await evaluate(`(async () => {
    const twoFrames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const collapseButton = document.querySelector('.sidebar-head .p-button');
    if (!collapseButton) return { ok: false, reason: 'collapse button missing' };
    const collapseStart = performance.now();
    collapseButton.click();
    await twoFrames();
    const collapseMs = performance.now() - collapseStart;
    const collapsed = document.querySelector('.order-sidebar')?.classList.contains('collapsed') ?? false;
    const rail = document.querySelector('.collapsed-rail');
    if (!rail) return { ok: false, reason: 'collapsed rail missing', collapseMs, collapsed };
    const expandStart = performance.now();
    rail.click();
    await twoFrames();
    const expandMs = performance.now() - expandStart;
    const expanded = !(document.querySelector('.order-sidebar')?.classList.contains('collapsed') ?? true);
    const orderRect = document.querySelector('.order-sidebar')?.getBoundingClientRect();
    const contentRect = document.querySelector('.hub-content')?.getBoundingClientRect();
    const overlapsContent = orderRect && contentRect
      ? !(orderRect.right <= contentRect.left || orderRect.left >= contentRect.right || orderRect.bottom <= contentRect.top || orderRect.top >= contentRect.bottom)
      : true;
    return {
      ok: true,
      collapseMs,
      expandMs,
      collapsed,
      expanded,
      overlapsContent,
      orderRight: orderRect?.right ?? 0,
      contentLeft: contentRect?.left ?? 0,
    };
  })()`);
  if (!orderTogglePerf.ok) fail(`Order sidebar toggle performance check could not run: ${orderTogglePerf.reason ?? 'unknown'}.`);
  if (!orderTogglePerf.collapsed) fail('Order sidebar did not collapse.');
  if (!orderTogglePerf.expanded) fail('Order sidebar did not expand.');
  if (orderTogglePerf.overlapsContent) {
    fail(`Expanded order sidebar must push the right UI instead of covering it. orderRight=${orderTogglePerf.orderRight.toFixed(1)}, contentLeft=${orderTogglePerf.contentLeft.toFixed(1)}.`);
  }
  if (orderTogglePerf.collapseMs > orderToggleBudgetMs) fail(`Order sidebar collapse took too long: ${orderTogglePerf.collapseMs.toFixed(1)}ms.`);
  if (orderTogglePerf.expandMs > orderToggleBudgetMs) fail(`Order sidebar expand took too long: ${orderTogglePerf.expandMs.toFixed(1)}ms.`);

  const homepageOrderState = await evaluate(`(() => ({
    hasTodaySection: Boolean(document.querySelector('.order-section.today')),
    homepageCompleteButtons: document.querySelectorAll('.order-card .order-side button').length,
    weekCards: document.querySelectorAll('.order-section.week .order-card').length,
  }))()`);
  if (homepageOrderState.hasTodaySection) fail('Homepage order sidebar must not render the today-order section.');
  if (homepageOrderState.homepageCompleteButtons > 0) fail('Homepage order cards must not render completion buttons.');
  if (homepageOrderState.weekCards < 1) fail('Homepage order sidebar should still show this-week order cards.');
  const orderCardVisualState = await evaluate(`(() => {
    const rank = { back: 0, front: 1, 'no-drawing': 2, exception: 3 };
    const cards = [...document.querySelectorAll('.order-section.week .order-card')];
    const overlaps = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
    const tonesByCustomer = new Map();
    let toneConsistent = true;
    const statuses = [];
    let hasOverlap = false;
    for (const card of cards) {
      const status = card.querySelector('.status');
      const model = card.querySelector('.model-button');
      const customer = card.querySelector('.card-meta span');
      const quantity = card.querySelector('.card-meta b');
      const tone = [...card.classList].find((name) => name.startsWith('tone-'));
      const customerText = customer?.textContent?.trim() ?? '';
      if (customerText) {
        if (tonesByCustomer.has(customerText) && tonesByCustomer.get(customerText) !== tone) toneConsistent = false;
        tonesByCustomer.set(customerText, tone);
      }
      const statusClass = [...(status?.classList ?? [])].find((name) => ['back', 'front', 'no-drawing', 'exception'].includes(name));
      if (statusClass) statuses.push(statusClass);
      if (status && model && overlaps(status.getBoundingClientRect(), model.getBoundingClientRect())) hasOverlap = true;
      if (customer && quantity && overlaps(customer.getBoundingClientRect(), quantity.getBoundingClientRect())) hasOverlap = true;
    }
    const sorted = statuses.every((status, index) => index === 0 || rank[statuses[index - 1]] <= rank[status]);
    return { sorted, toneConsistent, hasCustomerTone: [...tonesByCustomer.values()].every(Boolean), hasOverlap, statuses };
  })()`);
  if (!orderCardVisualState.sorted) fail(`Order cards must sort by back/front/no-drawing/exception. Actual: ${orderCardVisualState.statuses.join(',')}`);
  if (!orderCardVisualState.toneConsistent || !orderCardVisualState.hasCustomerTone) fail('Order cards must assign the same visible color tone to the same customer.');
  if (orderCardVisualState.hasOverlap) fail('Order card status, customer, and quantity labels must not overlap.');

  await click('document.querySelector(".header-actions button:nth-child(2)")', 'order overview for status edit and completion');
  await waitForExpression('Boolean(document.querySelector(".p-dialog"))', 'order overview dialog');
  const beforeOverviewOrderCount = await evaluate('document.querySelectorAll(".overview-row").length');
  const statusChanged = await evaluate(`(() => {
    const select = document.querySelector('.overview-row .status-select');
    if (!select) return false;
    select.value = 'exception';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return select.value === 'exception';
  })()`);
  if (!statusChanged) fail('Order overview status dropdown did not switch to exception.');
  await waitForExpression('[...document.querySelectorAll(".overview-row .status-select")].some((select) => select.value === "exception")', 'order overview status dropdown updated');
  await click('document.querySelector(".overview-row .complete-button")', 'complete first order from overview');
  const orderRemoved = await waitForExpression(`(() => {
    const count = document.querySelectorAll('.overview-row').length;
    return count === ${Math.max(beforeOverviewOrderCount - 1, 0)};
  })()`, 'completed overview order removed from active overview list');
  if (!orderRemoved) fail('Completing an order from overview did not remove it from the active order list.');
  await click('document.querySelector(".p-dialog-header button")', 'close order overview after completion test');
  await waitForExpression('!document.querySelector(".p-dialog")', 'order overview dialog closed after completion test');

  await click('document.querySelector(".module-card .actions button:nth-child(2)")', 'view all module items');
  const inGallery = await waitForExpression('Boolean(document.querySelector(".module-gallery"))', 'module gallery visible');
  if (!inGallery) fail('View-all action did not open the module gallery.');

  const itemCount = await evaluate('document.querySelectorAll(".gallery-item").length');
  if (itemCount > 0) {
    await click('document.querySelector(".gallery-item .thumb")', 'large preview item');
    const inViewer = await waitForExpression('Boolean(document.querySelector(".image-viewer .viewer-card"))', 'large viewer visible');
    if (!inViewer) fail('Gallery thumbnail did not open the large preview viewer.');
    await click('document.querySelector(".viewer-toolbar button")', 'back to gallery');
    await waitForExpression('Boolean(document.querySelector(".module-gallery"))', 'back to gallery');
  }

  await click('document.querySelector(".gallery-head button")', 'back to product');
  await waitForExpression('Boolean(document.querySelector(".product-home"))', 'back to product page');

  await click('document.querySelector(".module-card .actions button:nth-child(1)")', 'module upload dialog');
  const uploadDialog = await waitForExpression(`(() => {
    const dialog = document.querySelector('.p-dialog');
    const disabledSubmit = [...document.querySelectorAll('.p-dialog-footer button')].some((button) => button.disabled);
    return Boolean(dialog && disabledSubmit && dialog.innerText.includes('文件检查') && document.querySelector('.real-data-guard input'));
  })()`, 'upload dialog with disabled submit');
  if (!uploadDialog) fail('Upload dialog did not open with disabled submit before file selection.');
  await setFileInput('.p-dialog input[type="file"]', demoUploadFilePath, 'demo PDF upload selection');
  const uploadStillGuarded = await waitForExpression(`(() => {
    const dialog = document.querySelector('.p-dialog');
    const disabledSubmit = [...document.querySelectorAll('.p-dialog-footer button')].some((button) => button.disabled);
    const text = dialog?.innerText ?? '';
    return Boolean(dialog && disabledSubmit && text.includes('demo-drawing-rev-a.pdf') && text.includes('真实资料本机测试护栏'));
  })()`, 'upload dialog remains guarded after file selection');
  if (!uploadStillGuarded) fail('Selecting a file should not enable upload before the real-data test guard is acknowledged.');
  await click('document.querySelector(".real-data-guard input")', 'real-data upload guard acknowledgement');
  const selectedUploadFile = await waitForExpression(`(() => {
    const dialog = document.querySelector('.p-dialog');
    const enabledSubmit = [...document.querySelectorAll('.p-dialog-footer button')].some((button) => !button.disabled && button.innerText.includes('确认上传'));
    const text = dialog?.innerText ?? '';
    return Boolean(dialog && enabledSubmit && text.includes('demo-drawing-rev-a.pdf') && text.includes('文件检查') && text.includes('PDF') && document.querySelector('.real-data-guard.ready'));
  })()`, 'upload dialog selected demo PDF summary');
  if (!selectedUploadFile) fail('Selecting a demo PDF did not enable upload or show the file summary.');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await new Promise((resolveWait) => setTimeout(resolveWait, 500));

  await click('document.querySelector(".header-actions button:nth-child(2)")', 'order overview');
  const orderOverview = await waitForExpression('Boolean(document.querySelector(".p-dialog"))', 'order overview dialog');
  if (!orderOverview) fail('Order overview dialog did not open.');
  await click('document.querySelector(".p-dialog-header button")', 'close order overview');
  await waitForExpression('!document.querySelector(".p-dialog")', 'order overview dialog closed');

  await click('document.querySelector(".main-orb")', 'document hub orb for connector search');
  await click('document.querySelector(".orb-menu button:nth-child(2)")', 'connector mode for scoped search');
  await waitForExpression('Boolean(document.querySelector(".connector-table"))', 'connector table visible');
  await setInputValue('.hub-search input', 'CONN-24P-C', 'connector scoped search');
  await click('document.querySelector(".hub-search button[type=\\"submit\\"]")', 'submit connector scoped search');
  const connectorScopedSearch = await waitForExpression(`(() => {
    const rows = [...document.querySelectorAll('.connector-table .table-row')];
    return rows.length === 1 && rows[0].innerText.includes('CONN-24P-C') && !document.querySelector('.product-home');
  })()`, 'connector scoped search result');
  if (!connectorScopedSearch) fail('Connector search did not stay scoped to connector parameters.');

  await click('document.querySelector(".main-orb")', 'document hub orb for fixture search');
  await click('document.querySelector(".orb-menu button:nth-child(3)")', 'fixture mode for scoped search');
  await waitForExpression('Boolean(document.querySelector(".fixture-table"))', 'fixture table visible');
  await setInputValue('.hub-search input', 'JIG-CTRL-01', 'fixture scoped search');
  await click('document.querySelector(".hub-search button[type=\\"submit\\"]")', 'submit fixture scoped search');
  const fixtureScopedSearch = await waitForExpression(`(() => {
    const rows = [...document.querySelectorAll('.fixture-table .table-row')];
    return rows.length === 1 && rows[0].innerText.includes('JIG-CTRL-01') && !document.querySelector('.product-home');
  })()`, 'fixture scoped search result');
  if (!fixtureScopedSearch) fail('Fixture search did not stay scoped to fixture parameters.');

  await click('document.querySelector(".main-orb")', 'document hub orb return to drawing');
  await click('document.querySelector(".orb-menu button:nth-child(1)")', 'drawing mode restored after scoped search');
  await waitForExpression('Boolean(document.querySelector(".product-home"))', 'drawing product view restored after scoped searches');

  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  mkdirSync(dirname(screenshotPath), { recursive: true });
  writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
}

console.log('Tablet UI interaction check');
console.log('This check starts local Mock API/tablet dev servers and drives Chrome through key tablet interactions.');
console.log('Database connection or write operation: no.');

try {
  ensureDemoUploadAsset();
  const apiProcess = startApi();
  try {
    await waitForUrl(`${apiBase}/health`, 'Mock API');
  } catch (error) {
    if (apiProcess.latestOutput?.().trim()) {
      console.error('Recent tablet interaction Mock API log:');
      console.error(apiProcess.latestOutput().trim());
    }
    throw error;
  }
  const tabletProcess = startTablet();
  try {
    await waitForUrl(`http://127.0.0.1:${tabletPort}`, 'tablet dev server');
  } catch (error) {
    if (tabletProcess.latestOutput?.().trim()) {
      console.error('Recent tablet dev server log:');
      console.error(tabletProcess.latestOutput().trim());
    }
    throw error;
  }
  startChrome();
  await connectChrome();
  await navigate();
  await runChecks();
} finally {
  if (socket) socket.close();
  stopProcesses();
}

if (failures.length) {
  console.error('\nTablet UI interaction check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Saved orb menu open screenshot: ${resolve(orbMenuScreenshotPath)}`);
console.log(`Saved browser regression screenshot: ${resolve(screenshotPath)}`);
console.log('Tablet UI interaction check passed.');
