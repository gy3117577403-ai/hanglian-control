import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root = process.cwd();
const apiPort = Number(process.env.DOCUMENT_HUB_UPLOAD_PORT ?? 3102);
const apiBase = `http://127.0.0.1:${apiPort}/api`;
const demoAsset = join(root, 'demo-upload-assets', 'demo-drawing-rev-a.pdf');
const documentsJson = join(root, 'apps/api/storage/metadata/documents.json');
const auditLogsJson = join(root, 'apps/api/storage/metadata/audit-logs.json');
const deleteLockSettingsJson = join(root, 'apps/api/storage/metadata/delete-lock-settings.json');
const uploadsDir = join(root, 'apps/api/storage/uploads');
const sandboxPrefix = `HUB-SANDBOX-${Date.now()}`;
const productId = 'prod-hl-ctrl-1907b';
const moduleKey = 'original_drawing';
const sandboxDeletePassword = '123456';
const sandboxDeletePasswordHash = '$2b$10$GtGiZo5KXyurerdMofpKaOjqZDPHag6rNhRg5mblu3GP.jumH7xQC';
const uploadedIds = new Set();
const uploadedStoredFileNames = new Set();
let startedProcess;
let usedExistingApi = false;
let stoppingStartedProcess = false;
let deleteLockSnapshot;

function apiStartCommand() {
  if (process.platform === 'win32') {
    return { command: 'cmd.exe', args: ['/d', '/s', '/c', 'npm run start -w api'] };
  }
  return { command: 'npm', args: ['run', 'start', '-w', 'api'] };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe',
    windowsHide: true,
    ...options,
  });
  if (result.status !== 0) {
    throw new Error([
      `Command failed: ${command} ${args.join(' ')}`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join('\n'));
  }
  return result.stdout;
}

async function isApiRunning() {
  try {
    const response = await fetch(`${apiBase}/health`, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForApi(timeoutMs = 45000) {
  const startedAt = Date.now();
  let lastError = '';
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${apiBase}/health`);
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 700));
  }
  throw new Error(`API did not become ready at ${apiBase}: ${lastError}`);
}

async function startApiIfNeeded() {
  if (await isApiRunning()) {
    usedExistingApi = true;
    return;
  }

  const startCommand = apiStartCommand();
  startedProcess = spawn(startCommand.command, startCommand.args, {
    cwd: root,
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
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let bootLog = '';
  startedProcess.stdout?.on('data', (chunk) => {
    bootLog += chunk.toString();
    if (bootLog.length > 4000) bootLog = bootLog.slice(-4000);
  });
  startedProcess.stderr?.on('data', (chunk) => {
    bootLog += chunk.toString();
    if (bootLog.length > 4000) bootLog = bootLog.slice(-4000);
  });

  startedProcess.once('exit', (code) => {
    if (stoppingStartedProcess) return;
    if (code && code !== 0) {
      console.error(`Document hub sandbox API exited early with code ${code}.`);
      if (bootLog.trim()) console.error(bootLog.trim());
    }
  });

  try {
    await waitForApi();
  } catch (error) {
    if (bootLog.trim()) {
      console.error('Recent document hub sandbox API log:');
      console.error(bootLog.trim());
    }
    throw error;
  }
}

function stopStartedApi() {
  if (!startedProcess || startedProcess.killed) return;
  stoppingStartedProcess = true;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(startedProcess.pid), '/T', '/F'], {
      encoding: 'utf8',
      stdio: 'ignore',
      windowsHide: true,
    });
  } else {
    startedProcess.kill('SIGTERM');
  }
}

function readJsonArray(file) {
  if (!existsSync(file)) return [];
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}

function prepareSandboxDeleteLock() {
  mkdirSync(dirname(deleteLockSettingsJson), { recursive: true });
  deleteLockSnapshot = existsSync(deleteLockSettingsJson)
    ? readFileSync(deleteLockSettingsJson, 'utf8')
    : null;
  writeFileSync(deleteLockSettingsJson, JSON.stringify({
    enabled: true,
    passwordHash: sandboxDeletePasswordHash,
    updatedAt: new Date(0).toISOString(),
    updatedBy: 'document-hub-upload-check',
    failedAttempts: 0,
    lockedUntil: null,
  }, null, 2), 'utf8');
}

function restoreSandboxDeleteLock() {
  if (deleteLockSnapshot === undefined) return;
  if (deleteLockSnapshot === null) {
    rmSync(deleteLockSettingsJson, { force: true });
    return;
  }
  writeFileSync(deleteLockSettingsJson, deleteLockSnapshot, 'utf8');
}

function documentId(document) {
  return document?.documentId || document?.id;
}

function rememberDocument(documentLike) {
  const document = documentLike?.document ?? documentLike?.raw ?? documentLike;
  const id = documentId(document);
  if (id) uploadedIds.add(id);
  if (document?.storedFileName) uploadedStoredFileNames.add(document.storedFileName);
  const previewUrl = String(documentLike?.previewUrl ?? document?.previewUrl ?? '');
  const storedFromPreview = basename(previewUrl);
  if (/^[a-zA-Z0-9._-]+$/.test(storedFromPreview) && storedFromPreview.includes('.')) {
    uploadedStoredFileNames.add(storedFromPreview);
  }
}

async function uploadHubDrawing() {
  const bytes = await readFile(demoAsset);
  const formData = new FormData();
  formData.append('file', new Blob([bytes], { type: 'application/pdf' }), 'demo-drawing-rev-a.pdf');
  formData.append('title', `${sandboxPrefix} 主页面图纸上传验证`);
  formData.append('version', 'SANDBOX-REV-A');
  formData.append('productId', productId);
  formData.append('moduleKey', moduleKey);
  formData.append('keywords', 'sandbox,document-hub,upload-check');
  formData.append('remark', '自动化主页面资料库沙盒上传验证，非真实客户资料，测试结束自动清理。');

  const response = await fetch(`${apiBase}/document-hub/drawings/products/${productId}/modules/${moduleKey}/upload`, {
    method: 'POST',
    body: formData,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Document hub upload failed: HTTP ${response.status} ${JSON.stringify(body)}`);
  }
  if (!body.item?.previewUrl) throw new Error('Document hub upload did not return item.previewUrl.');
  rememberDocument(body.item);
  return body;
}

async function assertDetailContainsUpload() {
  const response = await fetch(`${apiBase}/document-hub/drawings/products/${productId}`);
  const detail = await response.json();
  if (!response.ok) throw new Error(`Product detail failed: HTTP ${response.status}`);
  const module = detail.modules?.find((item) => item.moduleKey === moduleKey);
  const uploadedItem = module?.items?.find((item) => String(item.title ?? '').includes(sandboxPrefix));
  if (!uploadedItem) throw new Error('Uploaded hub item was not merged into product detail.');
  if (!uploadedItem.previewUrl) throw new Error('Merged hub item has no previewUrl.');
  rememberDocument(uploadedItem);
  return uploadedItem;
}

async function assertPreviewReadable(item) {
  const response = await fetch(new URL(item.previewUrl, `${apiBase}/`).toString());
  if (!response.ok) throw new Error(`Preview fetch failed: HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength < 100) throw new Error('Preview response is unexpectedly small.');
  return bytes.byteLength;
}

async function deleteHubItem(item) {
  const response = await fetch(
    `${apiBase}/document-hub/drawings/products/${productId}/modules/${moduleKey}/items/${encodeURIComponent(item.itemId)}/delete`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: sandboxDeletePassword,
        reason: 'document-hub upload sandbox check cleanup',
      }),
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Document hub delete failed: HTTP ${response.status} ${JSON.stringify(body)}`);
  }
  if (!body.success) throw new Error('Document hub delete did not return success.');
  return body;
}

async function assertDetailRemovedUpload() {
  const response = await fetch(`${apiBase}/document-hub/drawings/products/${productId}`);
  const detail = await response.json();
  if (!response.ok) throw new Error(`Product detail after delete failed: HTTP ${response.status}`);
  const module = detail.modules?.find((item) => item.moduleKey === moduleKey);
  const uploadedItem = module?.items?.find((item) => String(item.title ?? '').includes(sandboxPrefix));
  if (uploadedItem) throw new Error('Deleted hub item is still visible in product detail.');
}

function cleanupSandboxArtifacts() {
  const documents = readJsonArray(documentsJson);
  const nextDocuments = documents.filter((document) => {
    const id = documentId(document);
    const title = String(document?.title ?? '');
    const isSandbox = uploadedIds.has(id) || title.includes(sandboxPrefix);
    if (isSandbox && document?.storedFileName) uploadedStoredFileNames.add(document.storedFileName);
    return !isSandbox;
  });
  if (nextDocuments.length !== documents.length) writeJsonArray(documentsJson, nextDocuments);

  const auditLogs = readJsonArray(auditLogsJson);
  const nextAuditLogs = auditLogs.filter((log) => {
    const entityId = String(log?.entityId ?? '');
    const message = String(log?.message ?? '');
    return !uploadedIds.has(entityId) && !message.includes(sandboxPrefix);
  });
  if (nextAuditLogs.length !== auditLogs.length) writeJsonArray(auditLogsJson, nextAuditLogs);

  const removedFiles = [];
  for (const storedFileName of uploadedStoredFileNames) {
    if (!/^[a-zA-Z0-9._-]+$/.test(storedFileName)) continue;
    const target = resolve(uploadsDir, storedFileName);
    if (!target.startsWith(resolve(uploadsDir))) continue;
    if (existsSync(target)) {
      rmSync(target, { force: true });
      removedFiles.push(storedFileName);
    }
  }
  return {
    removedDocuments: documents.length - nextDocuments.length,
    removedAuditLogs: auditLogs.length - nextAuditLogs.length,
    removedFiles,
  };
}

function assertCleaned() {
  const documents = readJsonArray(documentsJson);
  const remainingDocuments = documents.filter((document) => {
    const id = documentId(document);
    return uploadedIds.has(id) || String(document?.title ?? '').includes(sandboxPrefix);
  });
  if (remainingDocuments.length) {
    throw new Error(`Document hub sandbox documents were not cleaned: ${remainingDocuments.map((item) => documentId(item)).join(', ')}`);
  }

  const remainingFiles = [...uploadedStoredFileNames].filter((storedFileName) => existsSync(join(uploadsDir, storedFileName)));
  if (remainingFiles.length) {
    throw new Error(`Document hub sandbox uploaded files were not cleaned: ${remainingFiles.join(', ')}`);
  }
}

console.log('Document hub upload check');
console.log('This check starts a local Mock API if needed, uploads a generated demo file through document-hub, verifies preview, then removes only the artifacts it created.');
console.log('Database connection or write operation: no.');

try {
  if (!existsSync(demoAsset)) {
    console.log('Demo upload assets missing; generating safe synthetic files.');
    run('node', ['scripts/generate-demo-upload-assets.mjs']);
  }

  const sample = readFileSync(demoAsset, 'utf8');
  if (!sample.includes('DEMO ONLY') || !sample.includes('non-real customer material')) {
    throw new Error('Demo PDF does not contain the required non-real customer material notice.');
  }

  prepareSandboxDeleteLock();
  await startApiIfNeeded();
  console.log(`API ready: ${apiBase}${usedExistingApi ? ' (existing process)' : ' (sandbox process)'}`);

  const uploaded = await uploadHubDrawing();
  console.log(`Uploaded hub sandbox item: ${uploaded.item.itemId}`);

  const mergedItem = await assertDetailContainsUpload();
  console.log('Product detail includes uploaded hub item.');

  const previewBytes = await assertPreviewReadable(mergedItem);
  console.log(`Preview stream readable: ${previewBytes} bytes`);

  const deleteResult = await deleteHubItem(mergedItem);
  console.log(`Deleted hub sandbox item through API; file result: ${deleteResult.fileResult?.reason ?? 'unknown'}`);

  await assertDetailRemovedUpload();
  console.log('Product detail no longer includes deleted hub item.');
} finally {
  stopStartedApi();
  restoreSandboxDeleteLock();
}

const cleanup = cleanupSandboxArtifacts();
assertCleaned();
console.log(`Cleaned document hub sandbox artifacts: documents=${cleanup.removedDocuments}, auditLogs=${cleanup.removedAuditLogs}, files=${cleanup.removedFiles.length}`);
console.log('Document hub upload check passed.');
