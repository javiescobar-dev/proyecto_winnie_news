// Servidor local que imita a Vercel: sirve public/ y ejecuta api/<nombre>.js.
// Uso: npm run dev  →  http://localhost:3000   (se reinicia solo al cambiar api/, lib/ o data/)
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT) || 3000;

try {
  process.loadEnvFile(path.join(ROOT, '.env'));
} catch {
  console.warn('⚠️  No hay archivo .env: copia .env.example a .env y rellénalo.');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

async function handleApi(req, res, name) {
  const file = path.join(ROOT, 'api', `${name}.js`);
  if (!/^[a-z0-9-]+$/i.test(name) || !fs.existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'No existe ese endpoint' }));
  }
  const { default: handler } = await import(pathToFileURL(file).href);
  await handler(req, res);
}

function handleStatic(res, pathname) {
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const file = path.resolve(PUBLIC_DIR, relative);
  if (!file.startsWith(PUBLIC_DIR + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('No encontrado');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

http
  .createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    try {
      if (pathname.startsWith('/api/')) await handleApi(req, res, pathname.slice(5));
      else handleStatic(res, pathname);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Error interno del servidor local' }));
    }
  })
  .listen(PORT, () => console.log(`Winnie News en http://localhost:${PORT}`));
