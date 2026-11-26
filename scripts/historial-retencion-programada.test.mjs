import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildHistoryRetentionChecks} from './build-history-retention-checks.mjs';

const migration=fs.readFileSync(new URL('../SQL/historial-retencion-programada.sql',import.meta.url),'utf8');
const rollback=fs.readFileSync(new URL('../SQL/historial-retencion-programada.rollback.sql',import.meta.url),'utf8');
const activation=fs.readFileSync(new URL('../SQL/historial-retencion-programada.activar.sql',import.meta.url),'utf8');
const activationRollback=fs.readFileSync(new URL('../SQL/historial-retencion-programada.activar.rollback.sql',import.meta.url),'utf8');

test('scheduled retention removes all deletion work from the user save transaction',()=>{
  const trigger=migration.match(/create or replace function public\.datos_estudio_archiva\(\)[\s\S]*?\$function\$;/i)?.[0]||'';
  const guard=migration.match(/do \$guard\$[\s\S]*?\$guard\$;/i)?.[0]||'';
  assert.match(trigger,/old\.contenido is not distinct from new\.contenido/i);
  assert.match(trigger,/interval '5 minutes'/i);
  assert.doesNotMatch(trigger,/delete from|skip locked/i);
  assert.match(trigger,/set search_path to ''/i);
  assert.match(migration,/moderno\.datos_estudio_archiva\/history-outside-save-v1/i);
  assert.match(migration,/trigger_count<>1/i);
  assert.match(migration,/t\.tgtype=19/i);
  assert.match(migration,/not coalesce\('search_path=public'=any\(trigger_config\),false\)/i);
  assert.match(migration,/Existe una funcion publica de limpieza sin huella verificada/i);
  assert.doesNotMatch(migration,/drop function if exists public\.app_limpiar_historial_guardado/i);
  assert.match(migration,/La funcion anterior de historial no tiene la huella esperada/i);
  assert.match(guard,/i\.indisvalid and i\.indisready[\s\S]*pg_get_indexdef\(i\.indexrelid,1,true\)='estudio_id'[\s\S]*pg_get_indexdef\(i\.indexrelid,2,true\)='bloque'[\s\S]*guardado_en/i);
  assert.match(guard,/no se cambia el trigger/i);
  assert.ok(migration.indexOf('no se cambia el trigger')<migration.indexOf('create or replace function public.datos_estudio_archiva()'));
});

test('cleanup is bounded, private, lock-safe and keeps an inactive anchor',()=>{
  assert.match(migration,/p_lote not between 1 and 50/i);
  assert.match(migration,/interval '30 days'[\s\S]*exists[\s\S]*\(reciente\.guardado_en,reciente\.id\)>\(h\.guardado_en,h\.id\)/i);
  assert.match(migration,/for update skip locked[\s\S]*limit p_lote/i);
  assert.match(migration,/presupuesto_bytes constant bigint:=16\*1024\*1024/i);
  assert.match(migration,/select h\.id,h\.guardado_en,[\s\S]*pg_column_size\(h\.contenido\)[\s\S]*as tamano_bytes[\s\S]*sum\(c\.tamano_bytes\)[\s\S]*m\.posicion=1 or m\.acumulado_bytes<=presupuesto_bytes/i);
  assert.doesNotMatch(migration,/select h\.id,h\.contenido,h\.guardado_en/i);
  assert.match(migration,/pg_try_advisory_xact_lock/i);
  assert.match(migration,/set lock_timeout to '1s'/i);
  assert.match(migration,/revoke all on function app_private\.limpiar_historial_guardado\(integer\) from public,anon,authenticated/i);
  assert.match(migration,/revoke all on function public\.datos_estudio_archiva\(\) from public,anon,authenticated/i);
  assert.match(migration,/revoke insert,update,delete,truncate,references,trigger on public\.datos_estudio_hist from public,anon,authenticated/i);
  assert.doesNotMatch(migration,/create\s+(?:unique\s+)?index/i);
});

test('cleanup records a private bounded backlog signal without counting the full history table',()=>{
  const cleanup=migration.match(/create or replace function app_private\.limpiar_historial_guardado[\s\S]*?\$function\$;/i)?.[0]||'';
  assert.match(migration,/create table if not exists app_private\.history_retention_status/i);
  assert.match(migration,/alter table app_private\.history_retention_status enable row level security/i);
  assert.match(migration,/last_deleted_bytes[\s\S]*last_byte_limited[\s\S]*oldest_pending_at[\s\S]*consecutive_saturated_runs[\s\S]*total_deleted[\s\S]*skipped_runs/i);
  assert.match(migration,/activation_preflight_at[\s\S]*projected_rows_per_day[\s\S]*nominal_bytes_per_day/i);
  assert.match(migration,/select h\.guardado_en into pendiente_desde[\s\S]*order by h\.guardado_en,h\.id[\s\S]*limit 1/i);
  assert.match(migration,/on conflict\(singleton\) do update set[\s\S]*consecutive_saturated_runs/i);
  assert.doesNotMatch(cleanup,/select\s+count\(\*\)[\s\S]{0,300}from public\.datos_estudio_hist/i);
});

test('installation never enables, schedules or mutates cron',()=>{
  assert.doesNotMatch(migration,/create extension/i);
  assert.doesNotMatch(migration,/cron\.schedule/i);
  assert.doesNotMatch(migration,/cron\./i);
});

test('explicit activation verifies pg_cron and capacity before naming an idempotent small-batch job',()=>{
  const activationUnit=activation.match(/do \$capacity_and_activate\$[\s\S]*?\$capacity_and_activate\$;/i)?.[0]||'';
  assert.doesNotMatch(activation,/create extension/i);
  assert.doesNotMatch(activation,/^begin;\s*$/im);
  assert.match(activation,/pg_extension where extname='pg_cron'/i);
  assert.match(activation,/has_function_privilege\(current_user,'app_private\.limpiar_historial_guardado\(integer\)','EXECUTE'\)/i);
  assert.match(activation,/pg_get_indexdef\(i\.indexrelid,1,true\)='estudio_id'[\s\S]*pg_get_indexdef\(i\.indexrelid,2,true\)='bloque'[\s\S]*guardado_en/i);
  assert.match(activation,/create index concurrently if not exists datos_estudio_hist_retencion_idx[\s\S]*\(guardado_en,id\)/i);
  assert.match(activation,/i\.indisvalid and i\.indisready/i);
  assert.match(activation,/n\.nspname='cron' and p\.proname='schedule' and p\.pronargs=3/i);
  assert.match(activation,/lote constant integer:=50[\s\S]*ejecuciones_dia constant bigint:=1440[\s\S]*presupuesto_bytes constant bigint:=16\*1024\*1024/i);
  assert.match(activation,/segundos<21600[\s\S]*Observacion insuficiente/i);
  assert.match(activation,/primera_revision is null[\s\S]*historial esta vacio[\s\S]*filas_observadas=0[\s\S]*no se activa sin muestra/i);
  assert.match(activation,/filter\(where h\.guardado_en>=ahora-interval '6 hours'\)[\s\S]*filter\(where h\.guardado_en>=ahora-interval '1 hour'\)/i);
  assert.match(activation,/filas_proyectadas:=greatest\([\s\S]*filas_6h\*4[\s\S]*filas_1h\*24/i);
  assert.match(activation,/filas_proyectadas\*factor_seguridad>capacidad_filas[\s\S]*bytes_proyectados\*factor_seguridad>capacidad_bytes/i);
  assert.match(activation,/set statement_timeout='30s';\s*do \$capacity_and_activate\$/i);
  assert.match(activation,/\$capacity_and_activate\$;\s*reset statement_timeout;/i);
  assert.doesNotMatch(activation,/capacity_and_activate[\s\S]*set_config\('statement_timeout'/i);
  assert.match(activation,/activation_preflight_at=clock_timestamp\(\)[\s\S]*projected_rows_per_day=filas_proyectadas[\s\S]*nominal_rows_per_day=capacidad_filas/i);
  assert.match(activation,/250 estudios x 9 bloques x 288 ventanas\/dia/i);
  assert.match(activation,/648\.000 revisiones\/dia[\s\S]*no[\s\S]*certifica 1\.000 usuarios/i);
  assert.match(activation,/moderno-history-retention[\s\S]*'\* \* \* \* \*'[\s\S]*begin; set local statement_timeout=''30s''; set local lock_timeout=''1s''; select app_private\.limpiar_historial_guardado\(50\); commit;/i);
  assert.doesNotMatch(activation,/limpiar_historial_guardado\((?:[5-9]\d|\d{3,})\d+\)/i);
  assert.match(activationUnit,/pg_extension where extname='pg_cron'[\s\S]*jobname='moderno-history-retention' and username<>current_user[\s\S]*pg_get_indexdef\(i\.indexrelid,1,true\)='estudio_id'[\s\S]*i\.indexrelid=to_regclass\('public\.datos_estudio_hist_retencion_idx'\)/i);
  assert.match(activationUnit,/filas_proyectadas\*factor_seguridad>capacidad_filas[\s\S]*bytes_proyectados\*factor_seguridad>capacidad_bytes[\s\S]*cron\.schedule/i);
  assert.equal((activation.match(/pg_extension where extname='pg_cron'/gi)||[]).length,2);
  assert.equal((activation.match(/jobname='moderno-history-retention' and username<>current_user/gi)||[]).length,2);
  assert.doesNotMatch(activation.replace(activationUnit,''),/cron\.schedule/i);
  assert.doesNotMatch(activation,/do \$activate\$/i);
});

test('rollback removes only this schedule/function and never broadens table access',()=>{
  const rollbackTrigger=rollback.match(/create or replace function public\.datos_estudio_archiva\(\)[\s\S]*?\$function\$;/i)?.[0]||'';
  assert.match(rollback,/set local statement_timeout to '30s'/i);assert.match(rollback,/set local lock_timeout to '1s'/i);
  assert.match(rollback,/jobname=''moderno-history-retention'' and username<>current_user[\s\S]*raise exception/i);
  assert.match(rollback,/position\(''limpiar_historial_guardado'' in command\)>0[\s\S]*raise exception/i);
  assert.match(rollback,/exists\(select 1 from cron\.job where jobname=''moderno-history-retention'' and username=current_user\)[\s\S]*cron\.unschedule\(''moderno-history-retention''\)/i);
  assert.match(activation,/jobname='moderno-history-retention' and username<>current_user[\s\S]*raise exception/i);
  assert.match(activationRollback,/jobname=''moderno-history-retention'' and username<>current_user[\s\S]*raise exception/i);
  assert.match(activationRollback,/exists\(select 1 from cron\.job where jobname=''moderno-history-retention'' and username=current_user\)[\s\S]*cron\.unschedule\(''moderno-history-retention''\)/i);
  assert.match(rollback,/moderno\.datos_estudio_archiva\/history-outside-save-v1/i);
  assert.match(rollback,/moderno\.app_private\.limpiar_historial_guardado\/history-retention-v1/i);
  assert.match(rollback,/moderno\.app_private\.history_retention_status\/v1/i);
  assert.match(rollback,/trigger_count<>1[\s\S]*t\.tgtype=19/i);
  assert.match(rollback,/lock table app_private\.history_retention_status in access exclusive mode/i);
  assert.match(rollback,/drop function app_private\.limpiar_historial_guardado\(integer\)/i);
  assert.match(rollback,/drop table app_private\.history_retention_status/i);
  assert.doesNotMatch(rollback,/drop (?:function|table) if exists/i);
  assert.doesNotMatch(rollbackTrigger,/delete from|skip locked/i);
  assert.match(rollbackTrigger,/nunca vuelve a cargar una limpieza sobre el guardado/i);
  assert.doesNotMatch(rollback,/\bgrant\b/i);
  assert.doesNotMatch(rollback,/delete from cron\.job_run_details/i);
  assert.doesNotMatch(activationRollback,/drop\s+index/i);
});

test('isolated SQL fixture embeds the exact migration and always rolls back',()=>{
  const built=buildHistoryRetentionChecks();
  assert.ok(built.includes(migration.replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'')));
  assert.match(built,/Requires an empty isolated database/);
  assert.ok(built.trimEnd().endsWith('rollback;'));
});
