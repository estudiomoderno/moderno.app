import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');

test('interactive saves use a short coalescing window before cloud confirmation',()=>{
  assert.match(html,/const LOCAL_SAVE_DEBOUNCE_MS=80,CLOUD_SAVE_DEBOUNCE_MS=120/);
  assert.match(html,/setTimeout\(persistNow,LOCAL_SAVE_DEBOUNCE_MS\)/);
  assert.match(html,/setTimeout\(cloudFlush,CLOUD_SAVE_DEBOUNCE_MS\)/);
});

test('saving a product always starts persistence after applying the draft',()=>{
  const start=html.indexOf('function saveItem(si,ii)');
  const end=html.indexOf('function refreshPrices()',start);
  const source=html.slice(start,end);
  assert.match(source,/closeModal\(\);render\(\);persistSoon\(\);/);
});
