// Tiny read-only static server for previewing the dashboard locally.
//   node scripts/dashboard/serve.mjs [port]
// Serves docs/dashboard only, binds to loopback, no writes, no directory escape.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from './lib/config.mjs';

const port = Number(process.argv[2]) || 3037;
const root = PATHS.outDir;
const types = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml' };

http
  .createServer((req, res) => {
    const rel = decodeURIComponent((req.url || '/').split('?')[0]);
    const target = path.join(root, rel === '/' ? 'index.html' : rel);
    // startsWith alone is not containment: root "/x/dashboard" would also match
    // "/x/dashboard-evil/secret". Compare the relative path instead.
    const rel2 = path.relative(path.resolve(root), path.resolve(target));
    if (rel2.startsWith('..') || path.isAbsolute(rel2)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    fs.readFile(target, (err, data) => {
      if (err) {
        res.writeHead(404).end('not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' });
      res.end(data);
    });
  })
  .listen(port, '127.0.0.1', () => console.log('dashboard preview on http://127.0.0.1:' + port));
