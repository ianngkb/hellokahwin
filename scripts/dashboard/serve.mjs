// Tiny read-only static server for previewing the dashboard locally.
//   node scripts/dashboard/serve.mjs [port]
// Serves docs/dashboard only, binds to loopback, no writes.
//
// Containment is checked on the REAL path, after symlinks are resolved: a
// symlink inside the output folder pointing at, say, the secrets directory
// would otherwise be served happily.

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { PATHS } from './lib/config.mjs';

const port = Number(process.argv[2]) || 3037;
const root = PATHS.outDir;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.css': 'text/css',
  '.js': 'text/javascript',
};

function contains(rootReal, targetReal) {
  const rel = path.relative(rootReal, targetReal);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

http
  .createServer(async (req, res) => {
    try {
      const rootReal = await fsp.realpath(root);
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const target = path.join(rootReal, urlPath === '/' ? 'index.html' : urlPath);

      // Lexical check first, so an obviously bad path never reaches the disk.
      if (!contains(rootReal, path.resolve(target))) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('forbidden');
        return;
      }

      // Then the real path, which is what defeats a symlink pointing outside.
      let realTarget;
      try {
        realTarget = await fsp.realpath(target);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('not found');
        return;
      }
      if (!contains(rootReal, realTarget)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('forbidden');
        return;
      }

      const stat = await fsp.stat(realTarget);
      if (!stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('not found');
        return;
      }

      res.writeHead(200, {
        'Content-Type': types[path.extname(realTarget)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      fs.createReadStream(realTarget).pipe(res);
    } catch (err) {
      // Never leak a stack trace or a filesystem path to the client.
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('error');
    }
  })
  .listen(port, '127.0.0.1', () => console.log('dashboard preview on http://127.0.0.1:' + port));

export { contains };
