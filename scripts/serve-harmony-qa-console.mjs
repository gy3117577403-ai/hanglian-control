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

server.listen(port, '127.0.0.1', () => {
  console.log(`Harmony QA Console: http://127.0.0.1:${port}`);
});
