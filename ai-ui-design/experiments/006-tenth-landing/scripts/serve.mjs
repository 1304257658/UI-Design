// 006 · 零依赖静态服务器。
// 用法：node scripts/serve.mjs [port]     默认 8781
// 只服务本实验目录，不做任何缓存，便于反复刷新对比。

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const port = Number(process.argv[2] || process.env.PORT || 8781);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const full = join(root, normalize(rel).replace(/^([/\\])+/, ''));
    if (!full.startsWith(root)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    const info = await stat(full).catch(() => null);
    if (!info || !info.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404');
      return;
    }
    const body = await readFile(full);
    res.writeHead(200, {
      'content-type': TYPES[extname(full).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
    }).end(body);
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }).end(String(err.message));
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`006 对比站已启动： http://127.0.0.1:${port}/`);
  console.log(`  对比页   http://127.0.0.1:${port}/index.html`);
  console.log(`  单页     http://127.0.0.1:${port}/cases/a.html  b.html  c.html  d.html`);
});
