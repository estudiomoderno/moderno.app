import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../app/', import.meta.url));
const port = Number(process.env.PORT || 3000);
const backend = new URL(process.env.SUPABASE_URL || 'https://sin-configurar.invalid');
const anonKey = process.env.SUPABASE_ANON_KEY || '';
let publicKey = anonKey.startsWith('sb_publishable_');
try { const claims=JSON.parse(Buffer.from(anonKey.split('.')[1]||'', 'base64url').toString()); publicKey=claims.role==='anon' && claims.ref===backend.hostname.split('.')[0]; } catch {}
if (backend.protocol!=='https:' || backend.username || backend.password || backend.pathname!=='/' || backend.search || backend.hash || !backend.hostname.endsWith('.supabase.co') || backend.hostname==='cgqtylvaapwbuwqvpjtb.supabase.co' || !publicKey) {
  throw new Error('Configura SUPABASE_URL y una clave pública del proyecto de pruebas en .env. El servidor local no admite producción ni claves administrativas.');
}
const safeBackend=backend.origin;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return;
  }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.includes('\\') || pathname.split('/').some(p => p.startsWith('.'))) {
      res.writeHead(403); res.end(); return;
    }
    let file = path.resolve(root, '.' + pathname);
    if (file !== path.resolve(root) && !file.startsWith(root)) {
      res.writeHead(403); res.end(); return;
    }
    if (pathname === '/' || !path.extname(pathname)) file = path.join(root, 'index.html');
    let body = await readFile(file);
    if(path.extname(file)==='.html'){
      body=Buffer.from(body.toString()
      .replace('const SUPABASE_URL = "https://auth.moderno.app";', 'const SUPABASE_URL = '+JSON.stringify(safeBackend)+';')
      .replace(/const SUPABASE_ANON_KEY = "[^"]+";/,'const SUPABASE_ANON_KEY = '+JSON.stringify(anonKey)+';')
      .replace('const LS_KEY="moderno_prod_v1";', 'const LS_KEY='+JSON.stringify('moderno_pruebas_'+backend.hostname.split('.')[0])+';'));
      if(!body.includes('const SUPABASE_URL = '+JSON.stringify(safeBackend)+';') || !body.includes('const LS_KEY='+JSON.stringify('moderno_pruebas_'+backend.hostname.split('.')[0])+';'))throw new Error('No se pudo aislar el HTML');
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Content-Security-Policy':"connect-src 'self' "+safeBackend+' wss://'+backend.hostname });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' ? 404 : 400); res.end();
  }
});
server.on('error', error => { console.error(`No se pudo arrancar: ${error.message}`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Moderno.app: http://localhost:${server.address().port} (Ctrl+C para detener)`));
