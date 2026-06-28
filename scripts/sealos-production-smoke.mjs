#!/usr/bin/env node
import { Blob } from 'node:buffer';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

const timeoutMs = positiveInt(process.env.SMOKE_TIMEOUT_MS, 15000);
const previewTimeoutMs = positiveInt(process.env.SMOKE_PREVIEW_TIMEOUT_MS, 120000);
const apiBaseUrl = normalizeApiBaseUrl(process.env.API_BASE_URL ?? '');
const adminUsername = process.env.ADMIN_USERNAME ?? '';
const adminPassword = process.env.ADMIN_PASSWORD ?? '';

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function fail(message) {
  console.error(`Sealos production smoke failed: ${message}`);
  process.exit(1);
}

function requireEnv(name, value) {
  if (!String(value ?? '').trim()) fail(`${name} is required.`);
}

function normalizeApiBaseUrl(value) {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.at(-1) !== 'api') parts.push('api');
    url.pathname = `/${parts.join('/')}`;
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/+$/, '');
  } catch {
    return trimmed;
  }
}

function assertProductionUrl() {
  requireEnv('API_BASE_URL', apiBaseUrl);
  const url = new URL(apiBaseUrl);
  if (url.protocol !== 'https:' && process.env.ALLOW_HTTP_SMOKE !== 'true') {
    fail('API_BASE_URL must be HTTPS for production smoke. Set ALLOW_HTTP_SMOKE=true only for local debugging.');
  }
}

function absoluteUrl(pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${apiBaseUrl}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

function authHeaders(token, extra = {}) {
  return {
    authorization: `Bearer ${token}`,
    ...extra,
  };
}

async function request(label, path, options = {}) {
  const url = absoluteUrl(path);
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(options.timeoutMs ?? timeoutMs),
  });
  const contentType = response.headers.get('content-type') ?? '';
  const body = await response.arrayBuffer();
  const text = Buffer.from(body).toString('utf8');
  if (!response.ok) {
    fail(`${label} returned HTTP ${response.status}: ${sanitize(text).slice(0, 500)}`);
  }
  return { response, contentType, body: Buffer.from(body), text };
}

async function requestJson(label, path, options = {}) {
  const result = await request(label, path, {
    ...options,
    headers: {
      accept: 'application/json',
      ...(options.headers ?? {}),
    },
  });
  try {
    return JSON.parse(result.text);
  } catch {
    fail(`${label} did not return JSON.`);
  }
}

function sanitize(value) {
  return String(value ?? '')
    .replaceAll(adminPassword, '[redacted:ADMIN_PASSWORD]')
    .replace(/"accessToken"\s*:\s*"[^"]+"/gi, '"accessToken":"[redacted]"')
    .replace(/"refreshToken"\s*:\s*"[^"]+"/gi, '"refreshToken":"[redacted]"');
}

function step(name) {
  console.log(`- ${name}`);
}

function pickProductId(products) {
  if (process.env.PRODUCT_ID) return process.env.PRODUCT_ID;
  const rows = Array.isArray(products) ? products : products?.items;
  if (!Array.isArray(rows) || rows.length === 0) {
    fail('No product found. Set PRODUCT_ID or create/import one product before running upload smoke.');
  }
  const first = rows[0];
  return first.id ?? first.productId ?? first.product?.id ?? first.product?.productId;
}

function documentId(document) {
  return document?.documentId ?? document?.id;
}

function assertPreviewReady(label, preview) {
  if (preview.previewStatus !== 'ready') {
    fail(`${label} preview is not ready: ${preview.previewStatus}${preview.errorMessage ? ` (${preview.errorMessage})` : ''}`);
  }
  if (!Array.isArray(preview.pages) || preview.pages.length === 0) {
    fail(`${label} preview has no pages.`);
  }
}

async function waitForPreview(label, documentIdValue, token) {
  const deadline = Date.now() + previewTimeoutMs;
  let lastPreview;
  while (Date.now() < deadline) {
    lastPreview = await requestJson(
      `${label} preview`,
      `/documents/${encodeURIComponent(documentIdValue)}/preview?accessToken=${encodeURIComponent(token)}`,
      { headers: authHeaders(token) },
    );
    if (lastPreview.previewStatus === 'ready') return lastPreview;
    if (lastPreview.previewStatus === 'failed') {
      fail(`${label} preview failed: ${lastPreview.errorMessage ?? 'unknown error'}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  fail(`${label} preview did not become ready within ${previewTimeoutMs}ms. Last status: ${lastPreview?.previewStatus ?? 'none'}`);
}

async function uploadDocument({ label, token, productId, filePath, mimeType, documentType, requiredForProcess }) {
  const fileBuffer = await readFile(filePath);
  const form = new FormData();
  form.append('file', new Blob([fileBuffer], { type: mimeType }), basename(filePath));
  form.append('productId', productId);
  form.append('documentType', documentType);
  form.append('title', `Sealos ${label} Smoke`);
  form.append('version', `Smoke-${label}-${Date.now()}`);
  form.append('requiredForProcess', requiredForProcess);
  form.append('status', 'effective');

  const upload = await requestJson(`${label} upload`, '/documents/upload', {
    method: 'POST',
    headers: authHeaders(token),
    body: form,
    timeoutMs: positiveInt(process.env.SMOKE_UPLOAD_TIMEOUT_MS, 60000),
  });
  const id = documentId(upload);
  if (!id) fail(`${label} upload response did not contain documentId/id.`);
  return { id, upload };
}

async function ensureSmokeFiles() {
  const tempRoot = await mkdtemp(join(tmpdir(), 'hanglian-sealos-smoke-'));
  const pdfFile = process.env.PDF_FILE || join(tempRoot, 'sealos-smoke.pdf');
  const pngFile = process.env.PNG_FILE || join(tempRoot, 'sealos-smoke.png');
  if (!process.env.PDF_FILE) await writeFile(pdfFile, createPdf('Sealos PDF Smoke'));
  if (!process.env.PNG_FILE) await writeFile(pngFile, createPng());
  if (!existsSync(pdfFile)) fail(`PDF_FILE does not exist: ${pdfFile}`);
  if (!existsSync(pngFile)) fail(`PNG_FILE does not exist: ${pngFile}`);
  return { pdfFile, pngFile };
}

function createPng() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR42mP8z8BQDwAFgwJ/lw9JPwAAAABJRU5ErkJggg==',
    'base64',
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
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += object;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8');
}

async function main() {
  assertProductionUrl();
  requireEnv('ADMIN_USERNAME', adminUsername);
  requireEnv('ADMIN_PASSWORD', adminPassword);

  console.log(`Sealos production smoke target: ${apiBaseUrl}`);
  const { pdfFile, pngFile } = await ensureSmokeFiles();

  step('health');
  const health = await requestJson('health', '/health');
  if (health.status && health.status !== 'ok') fail(`health status is ${health.status}`);

  step('login');
  const login = await requestJson('login', '/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: adminUsername, password: adminPassword }),
  });
  const token = login.accessToken;
  if (!token) fail('login response did not contain accessToken.');

  step('me');
  const me = await requestJson('me', '/auth/me', { headers: authHeaders(token) });
  if (!me.id && !me.username) fail('me response did not contain user identity.');

  step('today orders');
  await requestJson('today orders', '/orders/today', { headers: authHeaders(token) });

  step('products/:id/documents product selection');
  const products = await requestJson('products', '/products', { headers: authHeaders(token) });
  const productId = pickProductId(products);
  if (!productId) fail('Could not resolve product id from /products. Set PRODUCT_ID explicitly.');

  step('upload PDF');
  const pdf = await uploadDocument({
    label: 'PDF',
    token,
    productId,
    filePath: pdfFile,
    mimeType: 'application/pdf',
    documentType: 'drawing_pdf',
    requiredForProcess: 'common',
  });

  step('preview');
  const pdfPreview = await waitForPreview('PDF', pdf.id, token);
  assertPreviewReady('PDF', pdfPreview);

  step('preview page');
  const firstPdfPage = pdfPreview.pages[0];
  const pageResponse = await request('PDF preview page', firstPdfPage.imageUrl, {
    headers: authHeaders(token),
    timeoutMs: positiveInt(process.env.SMOKE_FILE_TIMEOUT_MS, 60000),
  });
  if (!pageResponse.contentType.startsWith('image/')) {
    fail(`PDF preview page returned unexpected content-type: ${pageResponse.contentType}`);
  }
  if (pageResponse.body.length === 0) fail('PDF preview page response was empty.');

  step('download');
  const download = await request('PDF download', `/documents/${encodeURIComponent(pdf.id)}/download`, {
    headers: authHeaders(token),
    timeoutMs: positiveInt(process.env.SMOKE_FILE_TIMEOUT_MS, 60000),
  });
  if (download.body.length === 0) fail('PDF download response was empty.');

  step('upload PNG');
  const png = await uploadDocument({
    label: 'PNG',
    token,
    productId,
    filePath: pngFile,
    mimeType: 'image/png',
    documentType: 'finished_detail_image',
    requiredForProcess: 'common',
  });

  step('image preview');
  const imagePreview = await waitForPreview('PNG', png.id, token);
  assertPreviewReady('PNG', imagePreview);

  step('products/:id/documents');
  const productDocuments = await requestJson(
    'products/:id/documents',
    `/products/${encodeURIComponent(productId)}/documents`,
    { headers: authHeaders(token) },
  );
  const documentsText = JSON.stringify(productDocuments);
  if (!documentsText.includes(pdf.id) || !documentsText.includes(png.id)) {
    fail('products/:id/documents did not include both uploaded smoke documents.');
  }

  console.log(JSON.stringify({
    success: true,
    apiBaseUrl,
    productId,
    adminUser: me.username ?? me.id,
    pdfDocumentId: pdf.id,
    pngDocumentId: png.id,
    pdfPreviewPages: pdfPreview.pages.length,
    imagePreviewPages: imagePreview.pages.length,
  }, null, 2));
}

main().catch((error) => {
  fail(error instanceof Error ? sanitize(error.message) : sanitize(error));
});
