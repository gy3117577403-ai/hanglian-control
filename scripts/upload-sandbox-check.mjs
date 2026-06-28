import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root = process.cwd();
const apiPort = Number(process.env.UPLOAD_SANDBOX_PORT ?? 3101);
const apiBase = `http://127.0.0.1:${apiPort}/api`;
const demoAsset = join(root, 'demo-upload-assets', 'demo-drawing-rev-a.pdf');
const documentsJson = join(root, 'apps/api/storage/metadata/documents.json');
const auditLogsJson = join(root, 'apps/api/storage/metadata/audit-logs.json');
const uploadsDir = join(root, 'apps/api/storage/uploads');
const sandboxPrefix = `SANDBOX-${Date.now()}`;
const uploadedIds = new Set();
const uploadedStoredFileNames = new Set();
let startedProcess;
let usedExistingApi = false;
let stoppingStartedProcess = false;

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

async function waitForApi(timeoutMs = 45000) {
  const startedAt = Date.now();
  let lastError = '';
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${apiBase}/health`);
      if (response.ok) return true;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 700));
  }
  throw new Error(`API did not become ready at ${apiBase}: ${lastError}`);
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
      console.error(`Sandbox API exited early with code ${code}.`);
      if (bootLog.trim()) console.error(bootLog.trim());
    }
  });

  await waitForApi();
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

function documentId(document) {
  return document?.documentId || document?.id;
}

function rememberUploadedDocument(item) {
  const document = item?.document ?? item?.raw ?? item;
  const id = documentId(document);
  if (id) uploadedIds.add(id);
  if (document?.storedFileName) uploadedStoredFileNames.add(document.storedFileName);
  const previewUrl = String(item?.previewUrl ?? document?.previewUrl ?? '');
  const storedFromPreview = basename(previewUrl);
  if (/^[a-zA-Z0-9._-]+$/.test(storedFromPreview) && storedFromPreview.includes('.')) {
    uploadedStoredFileNames.add(storedFromPreview);
  }
}

function cleanupSandboxArtifacts() {
  const documents = readJsonArray(documentsJson);
  const nextDocuments = documents.filter((document) => {
    const id = documentId(document);
    const title = String(document?.title ?? '');
    const productCode = String(document?.productCode ?? document?.productId ?? '');
    const isSandbox = uploadedIds.has(id) || title.includes(sandboxPrefix) || productCode.includes(sandboxPrefix);
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
  return { removedFiles, removedDocuments: documents.length - nextDocuments.length, removedAuditLogs: auditLogs.length - nextAuditLogs.length };
}

async function uploadDemoDocument() {
  const bytes = await readFile(demoAsset);
  const formData = new FormData();
  formData.append('file', new Blob([bytes], { type: 'application/pdf' }), 'demo-drawing-rev-a.pdf');
  formData.append('customerName', '演示沙箱客户');
  formData.append('productCode', `${sandboxPrefix}-HL-TEST`);
  formData.append('productName', '上传沙箱测试线束');
  formData.append('productVersion', 'SANDBOX-A');
  formData.append('documentType', 'drawing_pdf');
  formData.append('title', `${sandboxPrefix} 上传沙箱图纸`);
  formData.append('version', 'SANDBOX-REV-A');
  formData.append('status', 'pending_review');
  formData.append('requiredForProcess', 'common');
  formData.append('keywords', 'sandbox, demo-only, upload-check');
  formData.append('remark', '自动化沙箱测试资料，非真实客户资料，测试结束自动清理。');

  const response = await fetch(`${apiBase}/unified-documents/upload`, {
    method: 'POST',
    body: formData,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Upload failed: HTTP ${response.status} ${JSON.stringify(body)}`);
  }
  rememberUploadedDocument(body);
  return body;
}

async function assertSearchFindsUpload() {
  const response = await fetch(`${apiBase}/unified-documents/search?q=${encodeURIComponent(sandboxPrefix)}`);
  const body = await response.json();
  if (!response.ok) throw new Error(`Search failed: HTTP ${response.status}`);
  if (!body.items?.some((item) => item.title?.includes(sandboxPrefix))) {
    throw new Error('Uploaded sandbox document was not found by unified search.');
  }
  for (const item of body.items ?? []) rememberUploadedDocument(item);
  return body.total ?? body.items?.length ?? 0;
}

async function assertPreviewReadable(uploaded) {
  const previewUrl = uploaded.previewUrl || uploaded.document?.previewUrl || uploaded.raw?.previewUrl;
  if (!previewUrl) throw new Error('Uploaded document did not return previewUrl.');
  const response = await fetch(new URL(previewUrl, `${apiBase}/`).toString());
  if (!response.ok) throw new Error(`Preview fetch failed: HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength < 100) throw new Error('Preview response is unexpectedly small.');
  return bytes.byteLength;
}

function assertCleaned() {
  const documents = readJsonArray(documentsJson);
  const remainingSandboxDocuments = documents.filter((document) => {
    const id = documentId(document);
    return uploadedIds.has(id) || String(document?.title ?? '').includes(sandboxPrefix) || String(document?.productCode ?? '').includes(sandboxPrefix);
  });
  if (remainingSandboxDocuments.length) {
    throw new Error(`Sandbox documents were not cleaned: ${remainingSandboxDocuments.map((item) => documentId(item)).join(', ')}`);
  }

  const remainingFiles = [...uploadedStoredFileNames].filter((storedFileName) => existsSync(join(uploadsDir, storedFileName)));
  if (remainingFiles.length) {
    throw new Error(`Sandbox uploaded files were not cleaned: ${remainingFiles.join(', ')}`);
  }
}

console.log('Upload sandbox check');
console.log('This check starts a local Mock API if needed, uploads a generated demo file, then removes only the artifacts it created.');
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

  await startApiIfNeeded();
  console.log(`API ready: ${apiBase}${usedExistingApi ? ' (existing process)' : ' (sandbox process)'}`);

  const uploaded = await uploadDemoDocument();
  console.log(`Uploaded sandbox document: ${uploaded.id}`);

  const foundCount = await assertSearchFindsUpload();
  console.log(`Unified search found sandbox document; result count: ${foundCount}`);

  const previewBytes = await assertPreviewReadable(uploaded);
  console.log(`Preview stream readable: ${previewBytes} bytes`);
} finally {
  stopStartedApi();
}

const cleanup = cleanupSandboxArtifacts();
assertCleaned();
console.log(`Cleaned sandbox artifacts: documents=${cleanup.removedDocuments}, auditLogs=${cleanup.removedAuditLogs}, files=${cleanup.removedFiles.length}`);
console.log('Upload sandbox check passed.');
