/**
 * Dev static server with SPA fallback: real files are served as-is and
 * unknown /app/** paths (deep links like /app/veh/<id> or /app/calc) get
 * app/index.html — mirroring the 404.html used by GitHub Pages in prod.
 * Started by `bun run dev` alongside `tsc --watch`.
 */
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const appIndex = `${root}app/index.html`;

Bun.serve({
  port: 5500,
  fetch(req) {
    let path = decodeURIComponent(new URL(req.url).pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = `${root}${path}`;
    if (existsSync(file) && statSync(file).isFile()) {
      return new Response(Bun.file(file));
    }
    if (path === '/app' || path.startsWith('/app/')) {
      return new Response(Bun.file(appIndex));
    }
    return new Response('Not Found', { status: 404 });
  }
});
console.log('Dev server on http://localhost:5500 (app at /app/)');
