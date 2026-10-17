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
