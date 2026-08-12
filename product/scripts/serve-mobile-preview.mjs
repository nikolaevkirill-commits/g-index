import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = normalize(fileURLToPath(new URL('../app/', import.meta.url)));
const port = Number(process.env.NEBORYTHM_PREVIEW_PORT || 4187);
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const requested = pathname === '/' ? 'index.html' : pathname.slice(1);
  const file = normalize(join(root, requested));

  if (!file.startsWith(root)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    if (!statSync(file).isFile()) throw new Error('Not a file');
    const contentType = file.endsWith('.webmanifest') ? types['.webmanifest'] : (types[extname(file)] || 'application/octet-stream');
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': contentType,
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Neborythm preview: http://127.0.0.1:${port}`);
});
