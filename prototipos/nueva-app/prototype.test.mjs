import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(dir, 'index.html'), 'utf8');
const js = readFileSync(join(dir, 'app.js'), 'utf8');
const css = readFileSync(join(dir, 'styles.css'), 'utf8');

test('HTML local autosuficiente con politica de red denegada', () => {
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /default-src 'none'/);
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /script-src 'self'/);
  assert.match(html, /stylesheet" href="\.\/styles\.css"/);
  assert.match(html, /src="\.\/app\.js"/);
  assert.doesNotMatch(html, /https?:\/\/|<iframe|<form\b|<script(?![^>]*src="\.\/app\.js")/i);
});

test('sin conexiones, servicios reales ni modulos productivos', () => {
  const all = html + '\n' + js + '\n' + css;
  const banned = [
    /https?:\/\//i,
    /(?:^|[^a-z])supabase(?:[^a-z]|$)/i,
    /\bfetch\s*\(/, /\bXMLHttpRequest\b/, /\bWebSocket\b/,
    /\bsendBeacon\s*\(/, /\bEventSource\b/,
    /<script[^>]+src="(?!\.\/app\.js)/i,
    /(?:\.\.\/)+(?:app|mailer|supabase|SQL)\//,
    /(?:\bimport\s*\(|\brequire\s*\()/
  ];
  for (const p of banned) assert.doesNotMatch(all, p);
});

test('conserva la marca oficial con recursos exclusivamente locales', () => {
  const brandCSS = readFileSync(join(dir, 'brand.css'), 'utf8');
  const symbol = readFileSync(join(dir, 'assets/simbolo-grafito.svg'), 'utf8');
  const favicon = readFileSync(join(dir, 'assets/favicon.svg'), 'utf8');
  assert.match(html, /src="\.\/assets\/simbolo-grafito\.svg"/);
  assert.match(html, /href="\.\/assets\/favicon\.svg"/);
  assert.match(html, /href="\.\/brand\.css"/);
  assert.match(symbol, /viewBox="0 0 126\.81361 100\.6104"/);
  assert.match(symbol, /fill="#323338"/);
  assert.match(brandCSS, /#f6f4eb/i);
  assert.match(brandCSS, /#f8f6ef/i);
  assert.match(brandCSS, /#e4dfce/i);
  assert.match(brandCSS, /#181818/i);
  assert.match(brandCSS, /#d8d2c2/i);
  assert.doesNotMatch(html + brandCSS + favicon, /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b/);
});

test('script valido, barra superior e inferior y datos simulados', () => {
  assert.doesNotThrow(() => new Function(js));
  assert.match(html, /id="global-nav"/);
  assert.match(html, /id="tool-dock"/);
  assert.match(html, /id="view"/);
  for (const name of ['Proyectos','Planos','Tareas','Compras','Documentos','Integraciones']) {
    assert.ok(js.includes(name), 'falta opcion '+name);
  }
  assert.match(css, /dock-tooltip/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(js, /\blocalStorage\b|\bsessionStorage\b/);
});
