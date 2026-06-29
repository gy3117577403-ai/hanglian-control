#!/usr/bin/env node
import { Blob } from 'node:buffer';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

const apiBaseUrl = normalizeApiBaseUrl(process.env.API_BASE_URL ?? 'https://fyeboolnlvqv.sealoshzh.site/api');
const adminUsername = process.env.ADMIN_USERNAME ?? 'admin';
const adminPassword = process.env.ADMIN_PASSWORD ?? '123';
const timeoutMs = positiveInt(process.env.HARMONY_API_E2E_TIMEOUT_MS, 20000);
const uploadTimeoutMs = positiveInt(process.env.HARMONY_API_E2E_UPLOAD_TIMEOUT_MS, 90000);
const previewTimeoutMs = positiveInt(process.env.HARMONY_API_E2E_PREVIEW_TIMEOUT_MS, 120000);
const reportsDir = join(process.cwd(), 'reports');
const jsonReportPath = join(reportsDir, 'harmony-api-e2e.json');
const mdReportPath = join(reportsDir, 'harmony-api-e2e.md');

const context = {
  token: '',
  customerId: '',
  productId: '',
  connectorId: '',
  importConnectorId: '',
  pdfDocumentId: '',
  pngDocumentId: '',
  previewPageStatus: 0,
  imagePreviewStatus: ''
};
const steps = [];

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeApiBaseUrl(value) {
  const trimmed = value.trim().replace(/\/+$/, '');
  const url = new URL(trimmed);
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.at(-1) !== 'api') parts.push('api');
  url.pathname = `/${parts.join('/')}`;
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/+$/, '');
}

function absoluteUrl(pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (pathOrUrl.startsWith('/')) {
    const base = new URL(apiBaseUrl);
    const basePath = base.pathname.replace(/\/+$/, '');
    if (basePath && (pathOrUrl === basePath || pathOrUrl.startsWith(`${basePath}/`))) {
      return `${base.origin}${pathOrUrl}`;
    }
  }
  return `${apiBaseUrl}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

function redact(value) {
  return String(value ?? '')
    .replaceAll(adminPassword, '[redacted:ADMIN_PASSWORD]')
    .replace(/"accessToken"\s*:\s*"[^"]+"/gi, '"accessToken":"[redacted]"')
    .replace(/"refreshToken"\s*:\s*"[^"]+"/gi, '"refreshToken":"[redacted]"')
    .replace(/([?&]accessToken=)[^"&\s]+/gi, '$1[redacted]');
}

function authHeaders(extra = {}) {
  return {
    authorization: `Bearer ${context.token}`,
    ...extra
  };
}

async function requestRaw(label, method, path, options = {}) {
  const response = await fetch(absoluteUrl(path), {
    ...options,
    method,
    signal: AbortSignal.timeout(options.timeoutMs ?? timeoutMs)
  });
  const body = Buffer.from(await response.arrayBuffer());
  const text = body.toString('utf8');
  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok) {
    const error = new Error(`${label} returned HTTP ${response.status}`);
    error.status = response.status;
    error.body = redact(text).slice(0, 2000);
    error.path = path;
    throw error;
  }
  return { status: response.status, body, text, contentType };
}

async function requestJson(label, method, path, options = {}) {
  const result = await requestRaw(label, method, path, {
    ...options,
    headers: {
      accept: 'application/json',
      ...(options.headers ?? {})
    }
  });
  try {
    return { ...result, json: result.text ? JSON.parse(result.text) : {} };
  } catch {
    const error = new Error(`${label} did not return JSON`);
    error.status = result.status;
    error.body = redact(result.text).slice(0, 2000);
    error.path = path;
    throw error;
  }
}

async function runStep(name, method, path, action) {
  const record = {
    name,
    method,
    path,
    status: 'fail',
    httpStatus: 0,
    message: '',
    responseBody: ''
  };
  steps.push(record);
  try {
    const result = await action();
    record.status = 'pass';
    record.httpStatus = result?.status ?? 200;
    record.message = '通过';
    console.log(`PASS ${name} ${method} ${path} HTTP ${record.httpStatus}`);
    return result;
  } catch (error) {
    record.status = 'fail';
    record.httpStatus = error.status ?? 0;
    record.message = error instanceof Error ? redact(error.message) : redact(error);
    record.responseBody = redact(error.body ?? '').slice(0, 2000);
    console.error(`FAIL ${name} ${method} ${path} HTTP ${record.httpStatus}`);
    console.error(record.message);
    throw error;
  }
}

function firstArray(value) {
  if (Array.isArray(value)) return value;
  return value?.data ?? value?.items ?? value?.rows ?? value?.records ?? value?.documents ?? [];
}

function idOf(value) {
  return value?.id ?? value?.productId ?? value?.customerId ?? value?.documentId ??
    value?.data?.id ?? value?.data?.productId ?? value?.data?.customerId ?? value?.data?.documentId ??
    value?.item?.id ?? value?.item?.productId ?? value?.item?.documentId ?? '';
}

function documentIdOf(value) {
  return value?.documentId ?? value?.id ?? value?.data?.documentId ?? value?.data?.id ?? value?.item?.documentId ?? value?.item?.id ?? '';
}

function firstDocumentId(value) {
  const rows = firstArray(value?.documents ?? value?.data?.documents ?? value);
  return rows.length > 0 ? documentIdOf(rows[0]) : '';
}

function assertId(label, value) {
  if (!value) throw new Error(`${label} did not return an id.`);
}

async function waitForPreview(label, documentId) {
  const deadline = Date.now() + previewTimeoutMs;
  let last = {};
  while (Date.now() < deadline) {
    const result = await requestJson(
      `${label} preview`,
      'GET',
      `/documents/${encodeURIComponent(documentId)}/preview?accessToken=${encodeURIComponent(context.token)}`,
      { headers: authHeaders() }
    );
    last = result.json;
    if (last.previewStatus === 'ready') return result;
    if (last.previewStatus === 'failed') {
      throw new Error(`${label} preview failed: ${last.errorMessage ?? 'unknown error'}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`${label} preview did not become ready. Last status: ${last.previewStatus ?? 'none'}`);
}

async function getPreviewPage(label, preview) {
  const firstPage = preview.json?.pages?.[0];
  const pageUrl = firstPage?.imageUrl;
  if (!pageUrl) throw new Error(`${label} preview did not include a page image.`);
  const result = await requestRaw(`${label} preview page`, 'GET', pageUrl, {
    headers: authHeaders(),
    timeoutMs: 60000
  });
  if (!result.contentType.startsWith('image/')) {
    throw new Error(`${label} preview page content-type was ${result.contentType}`);
  }
  if (result.body.length === 0) {
    throw new Error(`${label} preview page was empty.`);
  }
  return result;
}

async function uploadDocument(label, productId, filePath, mimeType, documentType) {
  const fileBuffer = await readFile(filePath);
  const form = new FormData();
  form.append('file', new Blob([fileBuffer], { type: mimeType }), basename(filePath));
  form.append('productId', productId);
  form.append('documentType', documentType);
  form.append('title', `Harmony Field ${label} ${Date.now()}`);
  form.append('version', `QA-${label}-${Date.now()}`);
  form.append('requiredForProcess', 'common');
  form.append('status', 'effective');
  form.append('source', 'manual_upload');
  const result = await requestJson(`${label} upload`, 'POST', '/documents/upload', {
    headers: authHeaders(),
    body: form,
    timeoutMs: uploadTimeoutMs
  });
  const documentId = documentIdOf(result.json);
  assertId(`${label} upload`, documentId);
  return { ...result, documentId };
}

async function ensureFiles() {
  const root = await mkdtemp(join(tmpdir(), 'hanglian-field-e2e-'));
  const pdfFile = join(root, 'harmony-field-e2e.pdf');
  const pngFile = join(root, 'harmony-field-e2e.png');
  await writeFile(pdfFile, createPdf('Harmony Field PDF E2E'));
  await writeFile(pngFile, createPng());
  return { pdfFile, pngFile };
}

function createPng() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR42mP8z8BQDwAFgwJ/lw9JPwAAAABJRU5ErkJggg==',
    'base64'
  );
}

function createPdf(text) {
  const escaped = text.replace(/[()\\]/g, '\\$&');
  const stream = `BT /F1 20 Tf 36 96 Td (${escaped}) Tj ET`;
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 360 160] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += object;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8');
}

function writeReports(success, failureMessage = '') {
  mkdirSync(reportsDir, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    success,
    apiBaseUrl,
    steps,
    summary: {
      customerCreated: Boolean(context.customerId),
      productCreated: Boolean(context.productId),
      productPatched: steps.some((step) => step.name === 'PATCH /products/:id' && step.status === 'pass'),
      connectorCrudVerified: steps.some((step) => step.name === 'DELETE /connector-params/:id' && step.status === 'pass'),
      importOneVerified: steps.some((step) => step.name === 'POST /connector-params/import-one' && step.status === 'pass'),
      pdfUploaded: Boolean(context.pdfDocumentId),
      pngUploaded: Boolean(context.pngDocumentId),
      previewPageFetched: context.previewPageStatus >= 200 && context.previewPageStatus < 300,
      productDocumentsRefreshed: steps.some((step) => step.name === 'GET /products/:id/documents final' && step.status === 'pass')
    },
    failureMessage: redact(failureMessage)
  };
  writeFileSync(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const lines = [
    '# Harmony API E2E',
    '',
    `- 结果：${success ? '通过' : '失败'}`,
    `- API_BASE_URL：${apiBaseUrl}`,
    `- 执行步骤：${steps.length}`,
    `- 失败步骤：${steps.filter((step) => step.status !== 'pass').length}`,
    '',
    '| 步骤 | 方法 | 路径 | 结果 | 状态码 | 说明 |',
    '| --- | --- | --- | --- | --- | --- |'
  ];
  for (const step of steps) {
    lines.push(`| ${step.name} | ${step.method} | ${step.path} | ${step.status === 'pass' ? '通过' : '失败'} | ${step.httpStatus || '-'} | ${(step.message || '-').replace(/\|/g, '/')} |`);
  }
  if (failureMessage) {
    lines.push('', `失败详情：${redact(failureMessage)}`);
  }
  writeFileSync(mdReportPath, `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  const { pdfFile, pngFile } = await ensureFiles();
  const stamp = Date.now();

  await runStep('GET /health', 'GET', '/health', () => requestJson('health', 'GET', '/health'));

  const login = await runStep('POST /auth/login', 'POST', '/auth/login', () => requestJson('login', 'POST', '/auth/login', {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: adminUsername, password: adminPassword })
  }));
  context.token = login.json.accessToken ?? login.json.data?.accessToken ?? '';
  assertId('login accessToken', context.token);

  await runStep('GET /auth/me', 'GET', '/auth/me', () => requestJson('me', 'GET', '/auth/me', { headers: authHeaders() }));
  await runStep('GET /customers', 'GET', '/customers', () => requestJson('customers', 'GET', '/customers', { headers: authHeaders() }));

  const customer = await runStep('POST /customers', 'POST', '/customers', () => requestJson('create customer', 'POST', '/customers', {
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ name: `现场自检客户-${stamp}`, code: `FIELD-CUS-${stamp}`, salesOwner: '现场自检' })
  }));
  context.customerId = idOf(customer.json);
  assertId('customer', context.customerId);

  await runStep('GET /products', 'GET', '/products', () => requestJson('products', 'GET', '/products', { headers: authHeaders() }));
  const productCode = `FIELD-HL-${stamp}`;
  const product = await runStep('POST /products', 'POST', '/products', () => requestJson('create product', 'POST', '/products', {
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({
      customerId: context.customerId,
      productCode,
      productModel: productCode,
      productName: `现场线束产品-${stamp}`,
      currentVersion: 'V1.0',
      processSegment: '通用'
    })
  }));
  context.productId = idOf(product.json);
  assertId('product', context.productId);

  await runStep('PATCH /products/:id', 'PATCH', '/products/:id', () => requestJson('patch product', 'PATCH', `/products/${encodeURIComponent(context.productId)}`, {
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({
      productCode,
      productModel: `${productCode}-R1`,
      productName: `现场线束产品-${stamp}`,
      currentVersion: 'V1.1',
      processSegment: '通用'
    })
  }));

  await runStep('GET /products/:id/documents', 'GET', '/products/:id/documents', () => requestJson('product documents', 'GET', `/products/${encodeURIComponent(context.productId)}/documents`, { headers: authHeaders() }));
  await runStep('GET /connector-params', 'GET', '/connector-params', () => requestJson('connector list', 'GET', '/connector-params', { headers: authHeaders() }));

  const connectorPayload = {
    connectorModel: `FIELD-CONN-${stamp}`,
    insertionLength: 10,
    outerStripLength: 5,
    innerStripLength: 3,
    remark: '现场自检',
    status: 'active'
  };
  const connector = await runStep('POST /connector-params', 'POST', '/connector-params', () => requestJson('create connector', 'POST', '/connector-params', {
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify(connectorPayload)
  }));
  context.connectorId = idOf(connector.json);
  assertId('connector', context.connectorId);

  await runStep('PATCH /connector-params/:id', 'PATCH', '/connector-params/:id', () => requestJson('patch connector', 'PATCH', `/connector-params/${encodeURIComponent(context.connectorId)}`, {
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ ...connectorPayload, insertionLength: 11, remark: '现场自检已编辑' })
  }));

  await runStep('DELETE /connector-params/:id', 'DELETE', '/connector-params/:id', () => requestJson('delete connector', 'DELETE', `/connector-params/${encodeURIComponent(context.connectorId)}`, { headers: authHeaders() }));

  const importOne = await runStep('POST /connector-params/import-one', 'POST', '/connector-params/import-one', () => requestJson('import one connector', 'POST', '/connector-params/import-one', {
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ ...connectorPayload, connectorModel: `FIELD-CONN-IMPORT-${stamp}`, insertionLength: 12, remark: '现场自检单型号导入' })
  }));
  context.importConnectorId = idOf(importOne.json);

  await runStep('GET /connector-params/export', 'GET', '/connector-params/export', () => requestRaw('connector export', 'GET', '/connector-params/export', { headers: authHeaders() }));
  await runStep('GET /recycle-bin', 'GET', '/recycle-bin', () => requestJson('recycle bin', 'GET', '/recycle-bin', { headers: authHeaders() }));

  const pdfUpload = await runStep('POST /documents/upload PDF', 'POST', '/documents/upload', () => uploadDocument('PDF', context.productId, pdfFile, 'application/pdf', 'drawing_pdf'));
  context.pdfDocumentId = pdfUpload.documentId;

  const pdfPreview = await runStep('GET /documents/:id/preview PDF', 'GET', '/documents/:id/preview', () => waitForPreview('PDF', context.pdfDocumentId));
  await runStep('GET preview page', 'GET', '/documents/:id/preview-pages/:pageNo', async () => {
    const result = await getPreviewPage('PDF', pdfPreview);
    context.previewPageStatus = result.status;
    return result;
  });

  const pngUpload = await runStep('POST /documents/upload PNG', 'POST', '/documents/upload', () => uploadDocument('PNG', context.productId, pngFile, 'image/png', 'finished_detail_image'));
  context.pngDocumentId = pngUpload.documentId;

  const pngPreview = await runStep('GET image preview', 'GET', '/documents/:id/preview', () => waitForPreview('PNG', context.pngDocumentId));
  context.imagePreviewStatus = pngPreview.json.previewStatus;

  const finalDocuments = await runStep('GET /products/:id/documents final', 'GET', '/products/:id/documents', () => requestJson('product documents final', 'GET', `/products/${encodeURIComponent(context.productId)}/documents`, { headers: authHeaders() }));
  const documentsText = JSON.stringify(finalDocuments.json);
  if (!documentsText.includes(context.pdfDocumentId) || !documentsText.includes(context.pngDocumentId)) {
    throw new Error('Product documents did not include both uploaded documents.');
  }

  writeReports(true);
}

main().catch((error) => {
  writeReports(false, error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
