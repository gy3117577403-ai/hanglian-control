import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', 'tools', 'harmony-qa-console');
const port = Number(process.env.PORT || 4179);

const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8']
]);

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', `http://127.0.0.1:${port}`);
  if (url.pathname === '/_qa_proxy') {
    void proxyRequest(request, response, url);
    return;
  }

  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const target = path.resolve(root, `.${requested}`);

  if (!target.startsWith(root)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.readFile(target, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': types.get(path.extname(target)) || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    response.end(content);
  });
});

async function proxyRequest(request, response, url) {
  const targetText = url.searchParams.get('target') || '';
  let target;
  try {
    target = new URL(targetText);
  } catch {
    response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ message: 'Invalid proxy target.' }));
    return;
  }

  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ message: 'Unsupported proxy target.' }));
    return;
  }

  const body = await readBody(request);
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (!value) continue;
    const lower = name.toLowerCase();
    if (['host', 'connection', 'content-length', 'origin', 'referer'].includes(lower)) continue;
    headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : body
    });
    const responseBody = Buffer.from(await upstream.arrayBuffer());
    response.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    response.end(responseBody);
  } catch (error) {
    response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ message: 'Proxy request failed.' }));
  }
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

server.listen(port, '127.0.0.1', () => {
  console.log(`Harmony QA Console: http://127.0.0.1:${port}`);
});
