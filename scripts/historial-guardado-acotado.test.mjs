import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../SQL/historial-guardado-acotado.sql',import.meta.url),'utf8');
const rollback=fs.readFileSync(new URL('../SQL/historial-guardado-acotado.rollback.sql',import.meta.url),'utf8');

test('history snapshots are throttled and expired rows are cleaned one at a time',()=>{
  assert.match(migration,/create or replace function public\.datos_estudio_archiva\(\)/i);
  assert.match(migration,/security definer\s+set search_path to 'public'/i);
  assert.match(migration,/h\.bloque=old\.bloque[\s\S]*interval '5 minutes'/i);
  assert.match(migration,/with vencida as[\s\S]*interval '30 days'[\s\S]*for update skip locked[\s\S]*limit 1[\s\S]*delete from public\.datos_estudio_hist/i);
  assert.doesNotMatch(migration,/\b(?:alter|drop)\s+(?:table|trigger|index)\b|\b(?:grant|revoke)\b/i);
});

test('history rollback restores the prior insert plus unbounded retention contract',()=>{
  assert.match(rollback,/insert into public\.datos_estudio_hist/i);
  assert.match(rollback,/delete from public\.datos_estudio_hist[\s\S]*interval '30 days'/i);
  assert.doesNotMatch(rollback,/5 minutes|skip locked|limit 1/i);
  assert.doesNotMatch(rollback,/\b(?:drop|alter)\s+(?:table|trigger|index)\b|\b(?:grant|revoke)\b/i);
});
