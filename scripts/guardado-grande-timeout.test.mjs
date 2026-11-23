import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../SQL/guardado-grande-timeout.sql',import.meta.url),'utf8');
const rollback=fs.readFileSync(new URL('../SQL/guardado-grande-timeout.rollback.sql',import.meta.url),'utf8');

test('large-study timeout is scoped to the two versioned writers',()=>{
  assert.equal((migration.match(/alter function public\.app_guardar_lote(?:_delta)?\(uuid,jsonb\)\s+set statement_timeout='60s'/g)||[]).length,2);
  assert.doesNotMatch(migration,/\balter\s+(?:role|database|system)\b/i);
  assert.doesNotMatch(migration,/\b(?:insert|update|delete|truncate|drop|grant|revoke|alter table|create policy)\b/i);
  assert.match(migration,/has_function_privilege\('anon'/);
  assert.match(migration,/has_function_privilege\('authenticated'/);
});

test('large-study timeout rollback restores role inheritance without touching data',()=>{
  assert.equal((rollback.match(/alter function public\.app_guardar_lote(?:_delta)?\(uuid,jsonb\)\s+reset statement_timeout/g)||[]).length,2);
  assert.doesNotMatch(rollback,/\b(?:insert|update|delete|truncate|drop|alter role|alter table)\b/i);
});
