import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildIdempotentSaveChecks} from './build-idempotent-save-checks.mjs';
import {buildIdempotentConcurrencyFixture} from './build-idempotent-concurrency-fixture.mjs';

const migration=fs.readFileSync(new URL('../SQL/guardado-idempotente-v2.sql',import.meta.url),'utf8');
const rollback=fs.readFileSync(new URL('../SQL/guardado-idempotente-v2.rollback.sql',import.meta.url),'utf8');
const concurrency=fs.readFileSync(new URL('./idempotent-concurrency-local.mjs',import.meta.url),'utf8');

test('v2 save is private, durable, idempotent and leaves legacy RPCs intact',()=>{
  assert.match(migration,/primary key\(estudio_id,actor_id,request_id\)/);
  assert.match(migration,/extensions\.digest\(convert_to\(solicitud_normalizada::text,'UTF8'\),'sha256'\)/);
  assert.match(migration,/obj_description\('public\.app_aplicar_delta\(jsonb,jsonb\)'::regprocedure,'pg_proc'\)[\s\S]*moderno\.app_aplicar_delta\/array-sync-v2/);
  assert.match(migration,/obj_description\('public\.app_guardar_lote_delta\(uuid,jsonb\)'::regprocedure,'pg_proc'\)[\s\S]*moderno\.app_guardar_lote_delta\/envelope-budget-v2/);
  assert.ok(migration.indexOf('Aplicar primero el upgrade delta con presupuestos')<migration.indexOf('create table if not exists app_private.save_requests'));
  assert.match(migration,/recibo\.result\|\|jsonb_build_object\('replayed',true\)/);
  assert.match(migration,/using errcode='PT409'/);
  assert.match(migration,/octet_length\(p_solicitud::text\)>24\*1024\*1024/);
  assert.match(migration,/candidato is not distinct from actual\.contenido/);
  assert.match(migration,/security definer\s+set search_path=''/);
  assert.match(migration,/revoke all on schema app_private from public,anon,authenticated/);
  assert.match(migration,/save_protocol_settings tiene una estructura incompatible/);
  assert.match(migration,/save_requests tiene una estructura incompatible/);
  assert.match(migration,/Los indices de app_private\.save_requests tienen una estructura incompatible/);
  assert.match(migration,/i\.indisvalid and i\.indisready and i\.indislive/);
  assert.match(migration,/on conflict\(protocol\) do update\s+set accept_new=true/);
  assert.match(migration,/create or replace function public\.app_confirmar_guardado_v2\(p_estudio uuid,p_request_id uuid\)/);
  assert.match(migration,/r\.actor_id=actor and r\.request_id=p_request_id/);
  assert.match(migration,/revoke all on function public\.app_confirmar_guardado_v2\(uuid,uuid\) from public,anon,authenticated/);
  assert.match(migration,/create index if not exists save_requests_ack_ttl_idx[\s\S]+where acknowledged_at is not null/);
  assert.match(migration,/create index if not exists save_requests_unack_ttl_idx[\s\S]+where acknowledged_at is null/);
  assert.match(migration,/old\.acknowledged_at<statement_timestamp\(\)-interval '24 hours'/);
  assert.match(migration,/old\.acknowledged_at is null\s+and old\.committed_at<statement_timestamp\(\)-interval '30 days'/);
  assert.match(migration,/old\.committed_at<statement_timestamp\(\)-interval '30 days'/);
  assert.equal((migration.match(/limit 8/g)||[]).length,2);
  assert.match(migration,/for update skip locked/);
  assert.match(migration,/acknowledged_at=coalesce\(r\.acknowledged_at,clock_timestamp\(\)\)/);
  assert.match(migration,/operaciones_total>64/);
  assert.match(migration,/sincronizaciones_bloque>8/);
  assert.match(migration,/sincronizaciones_total>8/);
  assert.match(migration,/identidades_total>8000/);
  assert.match(migration,/trabajo_delta>256::bigint\*1024\*1024/);
  assert.match(migration,/octet_length\(actual\.contenido::text\)::bigint[\s\S]+octet_length\(\(cambio->'cambios'\)::text\)::bigint[\s\S]+\*operaciones_bloque\*2/);
  assert.doesNotMatch(migration,/alter function public\.app_(?:guardar_lote|confirmar_guardado)_v2[^;]+statement_timeout/);
  const confirmation=migration.slice(migration.indexOf('create or replace function public.app_confirmar_guardado_v2'));
  assert.match(confirmation,/if not exists\([\s\S]+r\.actor_id=actor and r\.request_id=p_request_id[\s\S]+pg_advisory_xact_lock/);
  assert.doesNotMatch(confirmation,/delete from app_private\.save_requests/);
  assert.doesNotMatch(migration,/offset 32/);
  assert.match(migration,/c\.confrelid='public\.estudios'::regclass and c\.confdeltype='c'/);
  assert.match(migration,/c\.confrelid='auth\.users'::regclass and c\.confdeltype='c'/);
  assert.doesNotMatch(migration,/drop\s+(?:function|table|schema)/i);
  assert.doesNotMatch(migration,/create or replace function public\.app_guardar_lote(?:_delta)?\(/);
});

test('rollback drains prior receipts without deleting data or the endpoint',()=>{
  assert.match(rollback,/set accept_new=false/);
  assert.match(rollback,/app_confirmar_guardado_v2\(uuid,uuid\)/);
  assert.doesNotMatch(rollback,/\b(?:delete|drop|truncate|revoke)\b/i);
});

test('isolated SQL builder contains the real candidate and fictitious identities',()=>{
  const sql=buildIdempotentSaveChecks();
  assert.match(sql,/create or replace function public\.app_guardar_lote_v2/);
  assert.match(sql,/00000000-0000-4000-8000-000000000001/);
  assert.match(sql,/rollback;\s*$/);
  assert.match(sql,/for i in 1\.\.40 loop/);
  assert.match(sql,/repeat\('x',8\*1024\*1024\+1\)/);
  assert.match(sql,/repeat\('x',9\*1024\*1024\)/);
  assert.match(sql,/aggregate operations across blocks are bounded/);
  assert.match(sql,/aggregate array identities across blocks are bounded/);
  assert.match(sql,/large document repeated envelope work is rejected before applying/);
  assert.match(sql,/small document growth envelope work is rejected before applying/);
  assert.match(sql,/tab B lost ACK replays after tab A confirms/);
  assert.match(sql,/TTL removes acknowledged receipts after 24 hours and abandoned receipts after 30 days/);
  assert.match(sql,/lost response retry does not write twice/);
  assert.doesNotMatch(sql,/cgqtylvaapwbuwqvpjtb|auth\.moderno\.app/);
});

test('concurrency fixture is isolated and requires one commit plus nine replays',()=>{
  const fixture=buildIdempotentConcurrencyFixture();
  assert.match(fixture,/commit;\s*$/);
  assert.match(concurrency,/parallelClients:10,commits:1,replays:9,receipts:1/);
  assert.match(concurrency,/replies\.filter\(reply=>reply\.replayed===false\)\.length!==1/);
  assert.match(concurrency,/database!=='moderno_idempotent_concurrency'/);
  assert.doesNotMatch(fixture+concurrency,/cgqtylvaapwbuwqvpjtb|auth\.moderno\.app/);
});
